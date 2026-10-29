// Prueba del resumen que va a Slack, con tres mails de ejemplo (texto plano, multipart con HTML, cabecera codificada).
import { resumirCuerpo, decodificarCabecera } from "./worker.js";
import assert from "node:assert/strict";

const plano = "From: Pablo <pablo@example.com>\r\nSubject: Ayuda\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nHola, la foto no se procesa.\r\nGracias\r\n";
assert.equal(resumirCuerpo(plano), "Hola, la foto no se procesa.\nGracias");

const multi = [
  "From: a@b.c", "Subject: =?UTF-8?B?Q29uc3VsdGEgc29icmUgRmFpclNjYW4g8J+RiQ==?=", 'Content-Type: multipart/alternative; boundary="XYZ"', "",
  "--XYZ", "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: quoted-printable", "", "Qu=C3=A9 tal, =C2=BFfunciona sin se=C3=B1al?", "", "On Tue, X wrote:", "> cita vieja",
  "--XYZ", "Content-Type: text/html; charset=utf-8", "", "<p>Qué tal, <b>¿funciona sin señal?</b></p>", "--XYZ--", "",
].join("\r\n");
assert.equal(resumirCuerpo(multi), "Qué tal, ¿funciona sin señal?");
assert.equal(decodificarCabecera("=?UTF-8?B?Q29uc3VsdGEgc29icmUgRmFpclNjYW4g8J+RiQ==?="), "Consulta sobre FairScan 👉");

const soloHtml = 'Content-Type: multipart/mixed; boundary="Q"\r\n\r\n--Q\r\nContent-Type: text/html\r\n\r\n<div>Hola<br>chau</div>\r\n--Q--\r\n';
assert.equal(resumirCuerpo(soloHtml), "Hola\nchau");

console.log("resumen ok: 3 mails de ejemplo");
