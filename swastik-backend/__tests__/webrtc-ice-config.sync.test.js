jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

const consultationService = require('../services/consultationService');

describe('WebRTC ICE config helpers', () => {
  const { buildTurnUrlVariants } = consultationService._internals;

  test('keeps TURN UDP ahead of TCP for normal coturn URLs', () => {
    expect(buildTurnUrlVariants('turn:3.6.82.59:3478?transport=udp')).toEqual([
      'turn:3.6.82.59:3478?transport=udp',
      'turn:3.6.82.59:3478?transport=tcp',
    ]);
  });

  test('recovers from turns tcp-only config by keeping UDP relay first', () => {
    expect(buildTurnUrlVariants('turns:turn.vaididea.in:5349?transport=tcp')).toEqual([
      'turn:turn.vaididea.in:3478?transport=udp',
      'turn:turn.vaididea.in:3478?transport=tcp',
      'turns:turn.vaididea.in:5349?transport=tcp',
    ]);
  });
});
