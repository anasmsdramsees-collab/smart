import { Controller, Post, Body } from '@nestjs/common';
import { SilaService } from './sila.service';
import { CreateIntentDto } from './dto/create-intent.dto';

@Controller('v1/sila')
export class SilaController {
  constructor(private readonly silaService: SilaService) {}

  @Post('intents')
  async createIntent(@Body() dto: CreateIntentDto) {
    const result = this.silaService.classify(dto.text);
    const deviceActions = this.silaService.getDeviceActions(result.intent);
    const isConfident = this.silaService.isConfidentEnough(result.confidence);

    return {
      text: dto.text,
      intent: result.intent,
      confidence: result.confidence,
      isConfident,
      parameters: result.parameters || {},
      deviceActions,
      recommendation: isConfident
        ? `Execute: ${deviceActions.join(', ')}`
        : 'Confidence too low - ask user for clarification',
    };
  }
}
