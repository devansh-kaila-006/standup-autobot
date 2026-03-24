"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getNonce_1 = require("../../utils/getNonce");
describe('getNonce', () => {
    it('should return a string', () => {
        const nonce = (0, getNonce_1.getNonce)();
        expect(typeof nonce).toBe('string');
    });
    it('should return a 32-character string', () => {
        const nonce = (0, getNonce_1.getNonce)();
        expect(nonce.length).toBe(32);
    });
    it('should only contain alphanumeric characters', () => {
        const nonce = (0, getNonce_1.getNonce)();
        const alphanumeric = /^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]+$/;
        expect(nonce).toMatch(alphanumeric);
    });
    it('should generate different values on subsequent calls', () => {
        const nonce1 = (0, getNonce_1.getNonce)();
        const nonce2 = (0, getNonce_1.getNonce)();
        expect(nonce1).not.toBe(nonce2);
    });
    it('should generate unique values across multiple calls', () => {
        const nonces = new Set();
        for (let i = 0; i < 100; i++) {
            nonces.add((0, getNonce_1.getNonce)());
        }
        // With 32 alphanumeric characters, the probability of collision is extremely low
        // 100 calls should all be unique
        expect(nonces.size).toBe(100);
    });
});
//# sourceMappingURL=getNonce.test.js.map