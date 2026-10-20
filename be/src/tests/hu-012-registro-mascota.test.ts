/**
 * Archivo: tests/hu-012-registro-mascota.test.ts
 * Descripción: Tests de aceptación de la HU-012 (Registro de mascota) — RF-012.
 * ¿Para qué? Verificar los campos del registro (CA-012.1), el cliente inexistente (CA-012.2),
 *   que la mascota aparezca en el listado del cliente (CA-012.3) y que solo el staff registre.
 * ¿Impacto? Sin mascotas registradas el cliente no puede usar 🟢 ni 🟡 del semáforo.
 */

import crypto from "node:crypto";
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { loginTestStaff, loginTestUser, TEST_USER } from "./helpers.js";

const register = (token: string, body: object) =>
  request(app)
    .post("/api/v1/pets")
    .set("Authorization", `Bearer ${token}`)
    .send(body);

function messagesOf(body: { error: { message: string } }): string[] {
  return (JSON.parse(body.error.message) as { message: string }[]).map(
    (d) => d.message,
  );
}

// ¿Qué? Un cliente registrado (con su sesión) y una sesión de staff.
async function setup() {
  const client = await loginTestUser();
  const clientUser = await db.user.findUniqueOrThrow({
    where: { email: TEST_USER.email },
  });
  const staff = await loginTestStaff();
  return {
    clientToken: client.accessToken,
    clientId: clientUser.id,
    staffToken: staff.accessToken,
  };
}

describe("HU-012 — Registro de mascota", () => {
  // CA-012.1 / CA-012.3 — se registra con nombre, especie, raza, sexo y edad y el cliente la ve.
  it("registra la mascota y aparece en el listado del cliente", async () => {
    const { clientToken, clientId, staffToken } = await setup();
    const res = await register(staffToken, {
      clientId,
      name: "  Max  ",
      species: "canina",
      breed: "Criollo",
      gender: "Macho",
      age: 3,
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        name: "Max",
        gender: "macho",
        age: 3,
        breed: "Criollo",
      }),
    );

    const mine = await request(app)
      .get("/api/v1/pets/me")
      .set("Authorization", `Bearer ${clientToken}`);
    const forStaff = await request(app)
      .get(`/api/v1/pets?clientId=${clientId}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(mine.body.data.map((p: { name: string }) => p.name)).toEqual([
      "Max",
    ]);
    expect(forStaff.body.data).toHaveLength(1);
  });

  // CA-012.2 — cliente inexistente.
  it('responde 404 "Cliente no encontrado." si el cliente no existe', async () => {
    const { staffToken } = await setup();
    const res = await register(staffToken, {
      clientId: crypto.randomUUID(),
      name: "Max",
      species: "canina",
    });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Cliente no encontrado.");
  });

  // CA-012.2 — el id de una cuenta de staff tampoco es un cliente.
  it("responde 404 si el id es de una cuenta de staff", async () => {
    const { staffToken } = await setup();
    const staff = await db.user.findFirstOrThrow({ where: { role: "staff" } });
    const res = await register(staffToken, {
      clientId: staff.id,
      name: "Max",
      species: "canina",
    });

    expect(res.status).toBe(404);
  });

  // ¿Qué? El bug: un nombre de solo espacios se guardaba vacío.
  it("responde 422 si el nombre son solo espacios", async () => {
    const { clientId, staffToken } = await setup();
    const res = await register(staffToken, {
      clientId,
      name: "   ",
      species: "canina",
    });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain(
      "El nombre de la mascota es requerido.",
    );
    expect(await db.pet.count()).toBe(0);
  });

  it("responde 422 si el sexo no es macho ni hembra", async () => {
    const { clientId, staffToken } = await setup();
    const res = await register(staffToken, {
      clientId,
      name: "Max",
      species: "canina",
      gender: "xyz",
    });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain("El sexo debe ser macho o hembra.");
  });

  it("un sexo vacío se toma como no especificado", async () => {
    const { clientId, staffToken } = await setup();
    const res = await register(staffToken, {
      clientId,
      name: "Max",
      species: "canina",
      gender: "",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.gender).toBeNull();
  });

  it("responde 422 en español si la edad tiene decimales", async () => {
    const { clientId, staffToken } = await setup();
    const res = await register(staffToken, {
      clientId,
      name: "Max",
      species: "canina",
      age: 2.5,
    });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain(
      "La edad debe ser un número entero de años.",
    );
  });

  // Notas técnicas — solo el staff puede registrar.
  it("responde 403 si un cliente intenta registrar una mascota", async () => {
    const { clientToken, clientId } = await setup();
    const res = await register(clientToken, {
      clientId,
      name: "Max",
      species: "canina",
    });

    expect(res.status).toBe(403);
  });
});
