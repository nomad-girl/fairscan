import { describe, it, expect } from 'vitest';
import { configDeAnalitica, opcionesPostHog } from '../analitica.js';

describe('PostHog (27/10)', () => {
  it('solo se enciende con host https y clave pública de proyecto', () => {
    expect(configDeAnalitica({ host: 'https://us.i.posthog.com/', key: 'phc_abcdefghijklmnopqrstuvwxyz123456' })).toEqual({ host: 'https://us.i.posthog.com', key: 'phc_abcdefghijklmnopqrstuvwxyz123456' });
    expect(configDeAnalitica({ host: 'http://us.i.posthog.com', key: 'phc_abcdefghijklmnopqrstuvwxyz123456' })).toBeNull();
    expect(configDeAnalitica({ host: 'https://us.i.posthog.com', key: 'phx_personal_no_va_en_la_app_12345' })).toBeNull(); // una clave personal nunca
    expect(configDeAnalitica(null)).toBeNull();
  });
  it('las grabaciones tapan los campos y no graban fotos, video ni cámara; sin autocaptura', () => {
    const o = opcionesPostHog('https://us.i.posthog.com');
    expect(o.session_recording.maskAllInputs).toBe(true);
    for (const sel of ['img', 'video', 'canvas']) expect(o.session_recording.blockSelector).toContain(sel);
    expect(o.autocapture).toBe(false);
    expect(o.capture_pageview).toBe(false);
  });
});
