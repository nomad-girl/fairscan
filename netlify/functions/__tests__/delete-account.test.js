/**
 * La regla de borrado, que es la parte del código con más consecuencias:
 *
 *   · Sola en el equipo  → se borra todo (equipo, catálogo, fotos)
 *   · Con más gente      → se va ella, el catálogo queda
 *   · Si era la dueña    → la propiedad pasa a otro miembro
 *
 * Equivocarse acá significa borrar el catálogo de alguien que no lo pidió, o
 * dejar un equipo sin nadie que pueda administrarlo.
 */
import { describe, it, expect, vi } from 'vitest';
import { handler, _internals } from '../delete-account.js';

const { keyFromUrl, buildPlan, resumen, salirDelEquipo, elegirHeredero } = _internals;

/**
 * Imitación mínima del cliente de Supabase: encadena como el de verdad y
 * resuelve con lo que diga `responder(estado)`. Guarda todo lo que se le pidió
 * en `calls`, que es lo que miran los tests de transferencia.
 */
function makeDb(responder) {
  const calls = [];
  const from = (table) => {
    const st = { table, op: null, filters: {} };
    const chain = {
      select(cols, opts) { st.op = 'select'; st.cols = cols; st.opts = opts; return chain; },
      delete() { st.op = 'delete'; return chain; },
      update(v) { st.op = 'update'; st.value = v; return chain; },
      eq(c, v) { st.filters[c] = v; return chain; },
      is(c, v) { st.filters[c] = v; return chain; },
      maybeSingle() { st.single = true; return chain; },
      then(res, rej) {
        const snapshot = { ...st, filters: { ...st.filters } };
        calls.push(snapshot);
        return Promise.resolve(responder(snapshot) ?? {}).then(res, rej);
      },
    };
    return chain;
  };
  return { from, calls };
}

describe('keyFromUrl', () => {
  it('saca el nombre del archivo del link público', () => {
    process.env.R2_PUBLIC_URL = 'https://fotos.fairscan.app';
    expect(keyFromUrl('https://fotos.fairscan.app/photos/prov/12_1.jpg'))
      .toBe('photos/prov/12_1.jpg');
  });

  it('funciona también con el dominio por defecto de R2', () => {
    delete process.env.R2_PUBLIC_URL;
    process.env.R2_BUCKET_NAME = 'balde';
    process.env.R2_ACCOUNT_ID = 'cuenta';
    expect(keyFromUrl('https://balde.cuenta.r2.dev/cards/x_3.jpg')).toBe('cards/x_3.jpg');
  });

  it('descodifica los nombres con caracteres especiales', () => {
    process.env.R2_PUBLIC_URL = 'https://fotos.fairscan.app';
    expect(keyFromUrl('https://fotos.fairscan.app/photos/caf%C3%A9/1.jpg'))
      .toBe('photos/café/1.jpg');
  });

  it('devuelve null si no es un link', () => {
    expect(keyFromUrl(null)).toBeNull();
    expect(keyFromUrl('data:image/jpeg;base64,AAA')).toBeNull();
  });
});

describe('el plan', () => {
  // Perfiles conocidos: mamá cargó su nombre, la tía solo tiene mail, y "fantasma"
  // existe como miembro pero no tiene perfil.
  const perfiles = {
    mama: { id: 'mama', email: 'mama@x.com', display_name: 'Mamá' },
    tia: { id: 'tia', email: 'tia@x.com', display_name: null },
  };

  const armar = (miembros, createdBy = 'yo') => makeDb((c) => {
    if (c.table === 'team_members' && c.op === 'select' && c.filters.user_id === 'yo') {
      return { data: [{ team_id: 'T1', role: 'admin' }] };
    }
    if (c.table === 'team_members' && c.op === 'select') return { data: miembros };
    if (c.table === 'teams') return { data: { id: 'T1', name: 'Mi Equipo', created_by: createdBy } };
    if (c.table === 'profiles') return { data: perfiles[c.filters.id] || null };
    if (c.op === 'select' && c.opts?.head) {
      return { count: { districts: 2, suppliers: 30, products: 150 }[c.table] };
    }
    return {};
  });

  it('sola en el equipo → se borra todo', async () => {
    const plan = await buildPlan(armar([{ user_id: 'yo', role: 'admin' }]), 'yo');
    expect(plan[0].sola).toBe(true);
    expect(plan[0].accion).toBe('borrar');
    expect(plan[0].conteos).toEqual({ ferias: 2, proveedores: 30, productos: 150 });
  });

  it('con más gente → solo se va ella', async () => {
    const plan = await buildPlan(armar([
      { user_id: 'yo', role: 'admin' },
      { user_id: 'mama', role: 'member' },
    ]), 'yo');
    expect(plan[0].sola).toBe(false);
    expect(plan[0].accion).toBe('salir');
  });

  it('marca si era la dueña del equipo', async () => {
    const mio = await buildPlan(armar([{ user_id: 'yo', role: 'admin' }], 'yo'), 'yo');
    const ajeno = await buildPlan(armar([{ user_id: 'yo', role: 'member' }], 'otra'), 'yo');
    expect(mio[0].soyLaDuena).toBe(true);
    expect(ajeno[0].soyLaDuena).toBe(false);
  });

  it('si se va y era la dueña, dice a quién pasa la administración (por nombre)', async () => {
    const plan = await buildPlan(armar([
      { user_id: 'yo', role: 'admin', created_at: '2026-01-01' },
      { user_id: 'mama', role: 'member', created_at: '2026-02-01' },
    ]), 'yo');
    expect(plan[0].heredero).toEqual({ userId: 'mama', nombre: 'Mamá' });
  });

  it('si el perfil no tiene nombre, usa el mail', async () => {
    const plan = await buildPlan(armar([
      { user_id: 'yo', role: 'admin', created_at: '2026-01-01' },
      { user_id: 'tia', role: 'member', created_at: '2026-02-01' },
    ]), 'yo');
    expect(plan[0].heredero).toEqual({ userId: 'tia', nombre: 'tia@x.com' });
  });

  it('elige al heredero con la misma regla que el borrado real (otro admin primero)', async () => {
    const plan = await buildPlan(armar([
      { user_id: 'yo', role: 'admin', created_at: '2026-01-01' },
      { user_id: 'tia', role: 'member', created_at: '2026-02-01' },
      { user_id: 'mama', role: 'admin', created_at: '2026-06-01' },
    ]), 'yo');
    expect(plan[0].heredero.userId).toBe('mama');
    expect(elegirHeredero(plan[0].otrosMiembros).user_id).toBe('mama');
  });

  it('si no se puede saber el nombre, el heredero queda sin nombre', async () => {
    const plan = await buildPlan(armar([
      { user_id: 'yo', role: 'admin', created_at: '2026-01-01' },
      { user_id: 'fantasma', role: 'member', created_at: '2026-02-01' },
    ]), 'yo');
    expect(plan[0].heredero).toEqual({ userId: 'fantasma', nombre: null });
  });

  it('si no era la dueña, o está sola, no hay heredero ni consulta a perfiles', async () => {
    const ajena = armar([
      { user_id: 'yo', role: 'member' },
      { user_id: 'mama', role: 'admin' },
    ], 'mama');
    const sola = armar([{ user_id: 'yo', role: 'admin' }]);
    expect((await buildPlan(ajena, 'yo'))[0].heredero).toBeNull();
    expect((await buildPlan(sola, 'yo'))[0].heredero).toBeNull();
    expect(ajena.calls.find((c) => c.table === 'profiles')).toBeUndefined();
    expect(sola.calls.find((c) => c.table === 'profiles')).toBeUndefined();
  });

  it('no cuenta lo que ya estaba borrado', async () => {
    const db = armar([{ user_id: 'yo', role: 'admin' }]);
    await buildPlan(db, 'yo');
    const conteos = db.calls.filter((c) => c.opts?.head);
    expect(conteos.length).toBe(3);
    for (const c of conteos) expect(c.filters.deleted_at).toBeNull();
  });
});

describe('el resumen que ve la usuaria', () => {
  it('solo suma lo que efectivamente se borra', () => {
    const r = resumen([
      { nombre: 'Sola', accion: 'borrar', soyLaDuena: true, conteos: { ferias: 1, proveedores: 30, productos: 150 } },
      { nombre: 'Con mamá', accion: 'salir', soyLaDuena: false, conteos: { ferias: 9, proveedores: 99, productos: 999 } },
    ]);
    // Lo del equipo compartido NO entra en el total: ese catálogo no se borra.
    expect(r.totales).toEqual({ ferias: 1, proveedores: 30, productos: 150 });
    expect(r.seBorraCatalogo).toBe(true);
    expect(r.equiposQueQuedan).toEqual(['Con mamá']);
  });

  it('expone a quién pasa la administración, y solo si tiene nombre', () => {
    const r = resumen([
      { nombre: 'Con mamá', accion: 'salir', soyLaDuena: true, conteos: { ferias: 1, proveedores: 2, productos: 3 },
        heredero: { userId: 'mama', nombre: 'Mamá' } },
      { nombre: 'Sin datos', accion: 'salir', soyLaDuena: true, conteos: { ferias: 1, proveedores: 2, productos: 3 },
        heredero: { userId: 'fantasma', nombre: null } },
      { nombre: 'Sola', accion: 'borrar', soyLaDuena: true, conteos: { ferias: 1, proveedores: 2, productos: 3 } },
    ]);
    expect(r.equipos[0].heredero).toEqual({ nombre: 'Mamá' });
    // Sin nombre no se manda nada: la app no muestra la línea.
    expect(r.equipos[1].heredero).toBeNull();
    expect(r.equipos[2].heredero).toBeNull();
    // Y nunca se filtra el id de otra persona a la pantalla.
    expect(JSON.stringify(r)).not.toContain('userId');
  });

  it('sin equipos propios, no se borra ningún catálogo', () => {
    const r = resumen([
      { nombre: 'Ajeno', accion: 'salir', soyLaDuena: false, conteos: { ferias: 1, proveedores: 2, productos: 3 } },
    ]);
    expect(r.seBorraCatalogo).toBe(false);
    expect(r.totales).toEqual({ ferias: 0, proveedores: 0, productos: 0 });
  });
});

describe('salir de un equipo compartido', () => {
  const plan = (extra = {}) => ({
    teamId: 'T1',
    soyLaDuena: true,
    otrosMiembros: [
      { user_id: 'nueva', role: 'member', created_at: '2026-05-01' },
      { user_id: 'vieja', role: 'member', created_at: '2026-01-01' },
    ],
    ...extra,
  });

  it('si era la dueña, le pasa la propiedad al miembro más antiguo', async () => {
    const db = makeDb(() => ({}));
    await salirDelEquipo(db, plan(), 'yo');
    const traspaso = db.calls.find((c) => c.table === 'teams' && c.op === 'update');
    expect(traspaso.value).toEqual({ created_by: 'vieja' });
  });

  it('y lo asciende a admin, para que el equipo no quede sin quien lo administre', async () => {
    const db = makeDb(() => ({}));
    await salirDelEquipo(db, plan(), 'yo');
    const ascenso = db.calls.find((c) => c.table === 'team_members' && c.op === 'update');
    expect(ascenso.value).toEqual({ role: 'admin' });
    expect(ascenso.filters.user_id).toBe('vieja');
  });

  it('si ya hay otro admin, la propiedad va a ese aunque sea más nuevo', async () => {
    const db = makeDb(() => ({}));
    await salirDelEquipo(db, plan({
      otrosMiembros: [
        { user_id: 'vieja', role: 'member', created_at: '2026-01-01' },
        { user_id: 'jefa', role: 'admin', created_at: '2026-06-01' },
      ],
    }), 'yo');
    const traspaso = db.calls.find((c) => c.table === 'teams' && c.op === 'update');
    expect(traspaso.value).toEqual({ created_by: 'jefa' });
    // Ya era admin: no hace falta ascenderla.
    expect(db.calls.find((c) => c.table === 'team_members' && c.op === 'update')).toBeUndefined();
  });

  it('si no era la dueña, no toca la propiedad del equipo', async () => {
    const db = makeDb(() => ({}));
    await salirDelEquipo(db, plan({ soyLaDuena: false }), 'yo');
    expect(db.calls.find((c) => c.table === 'teams' && c.op === 'update')).toBeUndefined();
  });

  it('en todos los casos, la saca del equipo', async () => {
    const db = makeDb(() => ({}));
    await salirDelEquipo(db, plan(), 'yo');
    const salida = db.calls.find((c) => c.table === 'team_members' && c.op === 'delete');
    expect(salida.filters).toEqual({ team_id: 'T1', user_id: 'yo' });
  });
});

describe('el endpoint', () => {
  it('no borra nada sin sesión', async () => {
    process.env.AUTH_MODE = 'enforce';
    process.env.VITE_SUPABASE_URL = 'https://x.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon';
    const res = await handler({ httpMethod: 'POST', headers: {}, body: '{"confirm":true}' });
    expect(res.statusCode).toBe(401);
  });

  it('avisa si el servidor no tiene la llave maestra, en vez de fallar raro', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ id: 'u1', email: 'n@x.com' }) }));
    const res = await handler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer ok-borrado' },
      body: '{"preview":true}',
    });
    expect(res.statusCode).toBe(503);
    vi.unstubAllGlobals();
  });
});
