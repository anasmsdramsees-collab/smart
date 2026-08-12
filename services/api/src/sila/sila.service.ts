import { Injectable } from '@nestjs/common';

export interface IntentResult {
  intent: string;
  confidence: number;
  parameters?: Record<string, string | number>;
}

interface IntentRule {
  intent: string;
  keywords: string[];
  parameterExtractors?: {
    temperature?: RegExp;
    room?: RegExp;
    device?: RegExp;
  };
}

// Enhanced intent classifier with Arabic & English support
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whole-word match, Unicode-aware so it works for Arabic as well as Latin.
 * Plain `includes` matched 'ac' inside "back" and 'off' inside "coffee".
 */
function containsKeyword(haystack: string, keyword: string): boolean {
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(keyword.toLowerCase())}(?![\\p{L}\\p{N}])`, 'iu');
  return pattern.test(haystack);
}

const RULES: IntentRule[] = [
  {
    intent: 'SET_TEMPERATURE',
    keywords: ['درجة الحرارة', 'temperature', 'درجة', 'حرارة', '°c', 'degrees'],
    parameterExtractors: {
      temperature: /(\d{1,2})\s*(?:°c|درجة|degrees)?/i,
    },
  },
  {
    // Deliberately no bare 'turn on'/'off': those are device-agnostic verbs and
    // claiming them here made "turn on the AC" classify as a lighting request.
    intent: 'TURN_ON_LIGHTS',
    keywords: [
      'شغل الضوء', 'شغل النور', 'ضوء', 'نور',
      'turn on the light', 'turn on the lights', 'turn on light', 'turn on lights',
      'lights on', 'light on', 'illuminate',
    ],
  },
  {
    intent: 'TURN_OFF_LIGHTS',
    keywords: [
      'طفي الضوء', 'طفي النور', 'إطفاء الضوء', 'إطفاء النور',
      'turn off the light', 'turn off the lights', 'turn off light', 'turn off lights',
      'lights off', 'light off',
    ],
  },
  {
    intent: 'COOL_ROOM',
    keywords: ['برد', 'مكيف', 'حر', 'cooling', 'cool down', 'ac', 'air conditioner', 'تبريد'],
  },
  {
    intent: 'WARM_ROOM',
    keywords: ['دافئ', 'تدفئة', 'warm', 'heat', 'heating'],
  },
  {
    intent: 'PREPARE_HOME_FOR_SLEEP',
    keywords: ['نوم', 'sleep', 'bedtime', 'جهز البيت للنوم', 'good night', 'going to sleep'],
  },
  {
    intent: 'PREPARE_HOME_FOR_LEAVING',
    keywords: ['طالع', 'leaving', 'going out', 'مغادرة', 'good bye', 'bye'],
  },
  {
    intent: 'SECURE_HOME',
    keywords: ['أمان', 'قفل', 'lock', 'secure', 'alarm', 'security', 'حماية'],
  },
  {
    intent: 'OPEN_CURTAINS',
    keywords: ['فتح الستائر', 'open curtains', 'curtains open'],
  },
  {
    intent: 'CLOSE_CURTAINS',
    keywords: ['غلق الستائر', 'close curtains', 'curtains closed'],
  },
  {
    intent: 'INCREASE_BRIGHTNESS',
    keywords: ['زيادة الإضاءة', 'brighter', 'increase brightness', 'أكثر ضوء'],
  },
  {
    intent: 'DECREASE_BRIGHTNESS',
    keywords: ['تقليل الإضاءة', 'darker', 'decrease brightness', 'أقل ضوء'],
  },
  {
    intent: 'PLAY_MUSIC',
    keywords: ['موسيقى', 'music', 'play', 'غنية', 'song'],
  },
  {
    intent: 'STOP_MUSIC',
    keywords: ['وقف الموسيقى', 'stop music', 'pause', 'off'],
  },
];

const UNKNOWN_INTENT: IntentResult = { intent: 'UNKNOWN', confidence: 0 };

@Injectable()
export class SilaService {
  classify(text: string): IntentResult {
    const normalized = text.toLowerCase();

    let best: IntentResult = UNKNOWN_INTENT;
    let bestRule: IntentRule | null = null;

    for (const rule of RULES) {
      const matches = rule.keywords.filter((keyword) => containsKeyword(normalized, keyword));
      if (matches.length === 0) continue;

      // Weight by phrase length: a multi-word match like "air conditioner" is
      // stronger evidence than a two-letter token like "ac".
      const score = matches.reduce((sum, k) => sum + k.trim().split(/\s+/).length, 0);
      const confidence = Math.min(0.6 + score * 0.12, 0.95);
      if (confidence > best.confidence) {
        best = { intent: rule.intent, confidence };
        bestRule = rule;
      }
    }

    // Extract parameters if rules defined them
    if (bestRule && bestRule.parameterExtractors) {
      best.parameters = {};

      if (bestRule.parameterExtractors.temperature) {
        const tempMatch = text.match(bestRule.parameterExtractors.temperature);
        if (tempMatch) {
          best.parameters.temperature = parseInt(tempMatch[1], 10);
        }
      }

      if (bestRule.parameterExtractors.room) {
        const roomMatch = text.match(bestRule.parameterExtractors.room);
        if (roomMatch) {
          best.parameters.room = roomMatch[1];
        }
      }

      if (bestRule.parameterExtractors.device) {
        const deviceMatch = text.match(bestRule.parameterExtractors.device);
        if (deviceMatch) {
          best.parameters.device = deviceMatch[1];
        }
      }
    }

    return best;
  }

  // Map intents to device actions
  getDeviceActions(intent: string): string[] {
    const intentMap: Record<string, string[]> = {
      SET_TEMPERATURE: ['set_climate_temperature'],
      TURN_ON_LIGHTS: ['turn_on_lights'],
      TURN_OFF_LIGHTS: ['turn_off_lights'],
      COOL_ROOM: ['set_climate_mode_cool', 'turn_on_ac'],
      WARM_ROOM: ['set_climate_mode_heat'],
      PREPARE_HOME_FOR_SLEEP: [
        'turn_off_lights',
        'lock_doors',
        'set_climate_temperature',
        'close_curtains',
      ],
      PREPARE_HOME_FOR_LEAVING: ['turn_off_lights', 'lock_doors', 'arm_alarm'],
      SECURE_HOME: ['lock_doors', 'arm_alarm'],
      OPEN_CURTAINS: ['open_all_curtains'],
      CLOSE_CURTAINS: ['close_all_curtains'],
      INCREASE_BRIGHTNESS: ['increase_light_brightness'],
      DECREASE_BRIGHTNESS: ['decrease_light_brightness'],
      PLAY_MUSIC: ['play_music'],
      STOP_MUSIC: ['stop_music'],
    };

    return intentMap[intent] || [];
  }

  // Get confidence thresholds for actions
  isConfidentEnough(confidence: number): boolean {
    return confidence >= 0.6; // Require at least 60% confidence
  }
}
