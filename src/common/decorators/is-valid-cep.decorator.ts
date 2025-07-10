import axios from 'axios';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidCep', async: true })
export class IsValidCepConstraint implements ValidatorConstraintInterface {
  async validate(cep: string): Promise<boolean> {
    if (!cep || typeof cep !== 'string') {
      return false;
    }

    const numericCep = cep.replace(/\D/g, '');

    if (numericCep.length !== 8) {
      return false;
    }

    try {
      await axios.get(`https://brasilapi.com.br/api/cep/v1/${numericCep}`);
      return true;
    } catch (_error) {
      return false;
    }
  }
  defaultMessage(): string {
    return 'The provided CEP is invalid or does not exist.';
  }
}

export function IsValidCep(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCepConstraint,
    });
  };
}
