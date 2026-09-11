import {expect, test} from "bun:test";
import type {Db} from "@gnd/db";
import {recordInboundCreation} from "./inbound-creation-activity";
test("creation stores inbound identity and authenticated creator without notification subscribers", async () => {
 let saved: any;
 let updated: any;
 const db = {
 users: {findUniqueOrThrow: async () => ({id: 4, name: "Pablo"})},
 notePadContacts: {findFirst: async () => ({id: 8, name: null}), update: async (input: unknown) => {updated = input;}},
 notePad: {create: async (input: unknown) => {saved = input;}},
 } as unknown as Db;
 await recordInboundCreation(db, 317, 4);
 expect(saved.data.subject).toBe("Inbound created");
 expect(saved.data.headline).toBe("Pablo created inbound #317.");
 expect(saved.data.senderContactId).toBe(8);
 expect(saved.data.tags.createMany.data).toContainEqual({tagName: "inboundId", tagValue: "317"});
 expect(updated.data.name).toBe("Pablo");
});
test("unknown creator cannot produce an anonymous creation record", async () => {
 let wrote = false;
 const db = {users: {findUniqueOrThrow: async () => {throw new Error("Missing creator");}}, notePad: {create: async () => {wrote = true;}}} as unknown as Db;
 await expect(recordInboundCreation(db, 1, 99)).rejects.toThrow("Missing creator");
 expect(wrote).toBe(false);
});
