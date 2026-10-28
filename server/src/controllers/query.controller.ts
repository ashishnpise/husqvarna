import { Request, Response, NextFunction } from 'express';
import { QueryRequestDto } from '../schemas/query.schema.js';
import { llmService } from '../services/llm.service.js';

export async function submitQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as QueryRequestDto;
    const result = await llmService.executeQuery(dto);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    next(err);
  }
}
