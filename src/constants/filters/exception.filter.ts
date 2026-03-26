import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Response } from 'express';
import { BusinessCodes } from 'src/constants/business.code';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private formatValidationErrors(errors: ValidationError[]): any[] {
    const formattedErrors: any[] = [];

    const recurse = (error: ValidationError, parentProperty = '') => {
      const propertyPath = parentProperty
        ? `${parentProperty}.${error.property}`
        : error.property;

      if (error.constraints) {
        formattedErrors.push({
          field: propertyPath,
          errors: Object.values(error.constraints),
        });
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach((child) => recurse(child, propertyPath));
      }
    };

    errors.forEach((error) => recurse(error));
    return formattedErrors;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    let message: any = 'Internal server error';
    let businessCode = -1;
    let validationErrors: any[] | null = null;

    if (Array.isArray(exception) && exception[0] instanceof ValidationError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      businessCode = BusinessCodes.ERROR.code;
      validationErrors = this.formatValidationErrors(exception);
      message = validationErrors;
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;

      if (typeof exceptionResponse === 'object') {
        message = Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message[0]
          : exceptionResponse.message;

        businessCode = exceptionResponse.businessCode || businessCode;
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
      businessCode: businessCode,
    });
  }
}