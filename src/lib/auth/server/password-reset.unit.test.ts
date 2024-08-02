import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPasswordResetToken } from './password-reset';
import { passwordResets } from '$lib/db/postgres/schema/auth';
import { db } from '$lib/db/postgres';
import { eq } from 'drizzle-orm';
import { encodeHex } from 'oslo/encoding';
import { sha256 } from 'oslo/crypto';

vi.mock('$lib/db/postgres', () => ({
  db: {
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis()
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ tokenHash: 'mockedTokenHash' }])
        })
      })
    })
  }
}));

vi.mock('lucia', () => ({
  generateIdFromEntropySize: vi.fn().mockReturnValue('mockedToken')
}));

vi.mock('oslo', () => ({
  createDate: vi.fn().mockReturnValue(new Date()),
  TimeSpan: vi.fn().mockReturnValue({ hours: 2 })
}));

vi.mock('oslo/crypto', () => ({
  sha256: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
}));

vi.mock('oslo/encoding', () => ({
  encodeHex: vi.fn().mockReturnValue('mockedEncodedHash')
}));

describe('createPasswordResetToken', () => {
  const userId = 'testUserId';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete existing tokens', async () => {
    await createPasswordResetToken({ userId });
    expect(db.delete).toHaveBeenCalledWith(passwordResets);
    expect(db.delete(passwordResets).where).toHaveBeenCalledWith(eq(passwordResets.userId, userId));
  });

  it('should generate and return a new token', async () => {
    const mockToken = await createPasswordResetToken({ userId });
    expect(sha256).toHaveBeenCalled();
    expect(encodeHex).toHaveBeenCalled();
    expect(mockToken).toBe('mockedToken');
  });

  it('should hash and encode the token', async () => {
    await createPasswordResetToken({ userId });
    expect(sha256).toHaveBeenCalled();
    expect(encodeHex).toHaveBeenCalled();
  });

  it('should insert a new password reset token into the database', async () => {
    await createPasswordResetToken({ userId });
    expect(db.insert).toHaveBeenCalledWith(passwordResets);
    expect(db.insert(passwordResets).values).toHaveBeenCalledWith({
      tokenHash: 'mockedEncodedHash',
      userId: userId,
      expiresAt: expect.any(Date)
    });
  });

  it('should return an empty string if no token is created', async () => {
    vi.mocked(
      db
        .insert(passwordResets)
        .values({ tokenHash: 'mockedEncodedHash', userId: userId, expiresAt: expect.any(Date) })
        .onConflictDoNothing().returning
    ).mockResolvedValueOnce([]);
    const result = await createPasswordResetToken({ userId });
    expect(result).toBe('');
  });
});
