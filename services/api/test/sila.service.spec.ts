import { SilaService } from '../src/sila/sila.service';

describe('SilaService', () => {
  const sila = new SilaService();

  it('classifies "جهز البيت للنوم" as PREPARE_HOME_FOR_SLEEP', () => {
    const result = sila.classify('جهز البيت للنوم');
    expect(result.intent).toBe('PREPARE_HOME_FOR_SLEEP');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('classifies a cooling request as COOL_ROOM', () => {
    const result = sila.classify('the room is too hot, turn on the AC');
    expect(result.intent).toBe('COOL_ROOM');
  });

  it('returns UNKNOWN with zero confidence for unrelated text', () => {
    const result = sila.classify('what is the weather forecast for tomorrow');
    expect(result.intent).toBe('UNKNOWN');
    expect(result.confidence).toBe(0);
  });

  it('never returns a device command — only an intent classification', () => {
    const result = sila.classify('turn on the light');
    expect(result).toEqual({ intent: expect.any(String), confidence: expect.any(Number) });
    expect(result).not.toHaveProperty('command');
    expect(result).not.toHaveProperty('deviceId');
  });
});
