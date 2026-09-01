import { v4 as uuidv4 } from 'uuid';
import { credentialService } from '../credentialService.js';

export class VariableEngine {
  /**
   * Resolves any {{variable}} or {{credentials.id.field}} tokens in a string
   */
  public static resolve(template: any, contextVariables: Record<string, any>): any {
    if (typeof template !== 'string') {
      return template;
    }

    // Built-in variable providers
    const builtIns: Record<string, () => string | number> = {
      '$timestamp': () => new Date().toISOString(),
      '$unix': () => Date.now(),
      '$uuid': () => uuidv4(),
      '$random': () => Math.floor(Math.random() * 1000000),
      '$today': () => new Date().toISOString().split('T')[0],
    };

    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const trimmed = path.trim();

      // Check built-in tokens
      if (builtIns[trimmed]) {
        return String(builtIns[trimmed]());
      }

      // Check credential tokens e.g. {{credentials.myCredId.password}}
      if (trimmed.startsWith('credentials.')) {
        const parts = trimmed.split('.');
        const credId = parts[1];
        const field = parts[2] || 'secret';
        const cred = credentialService.getDecryptedCredential(credId);
        if (cred) {
          if (field === 'username' || field === 'email' || field === 'key') {
            return cred.username_or_key || '';
          }
          return cred.secret || '';
        }
        return '';
      }

      // Check nested context variables e.g. {{user.profile.name}}
      const keys = trimmed.split('.');
      let current: any = contextVariables;
      for (const k of keys) {
        if (current === undefined || current === null) break;
        current = current[k];
      }

      if (current !== undefined && current !== null) {
        return typeof current === 'object' ? JSON.stringify(current) : String(current);
      }

      // Return original match if not found
      return match;
    });
  }

  /**
   * Evaluates logic condition expressions e.g. equals, contains, greater, etc.
   */
  public static evaluateCondition(
    operator: string,
    leftValue: any,
    rightValue: any
  ): boolean {
    const left = leftValue !== undefined && leftValue !== null ? String(leftValue) : '';
    const right = rightValue !== undefined && rightValue !== null ? String(rightValue) : '';

    switch (operator) {
      case 'equals':
      case '==':
      case '===':
        return left.trim() === right.trim();
      case 'notEquals':
      case '!=':
      case '!==':
        return left.trim() !== right.trim();
      case 'contains':
        return left.toLowerCase().includes(right.toLowerCase());
      case 'notContains':
        return !left.toLowerCase().includes(right.toLowerCase());
      case 'startsWith':
        return left.startsWith(right);
      case 'endsWith':
        return left.endsWith(right);
      case 'greaterThan':
      case '>':
        return parseFloat(left) > parseFloat(right);
      case 'lessThan':
      case '<':
        return parseFloat(left) < parseFloat(right);
      case 'greaterThanOrEqual':
      case '>=':
        return parseFloat(left) >= parseFloat(right);
      case 'lessThanOrEqual':
      case '<=':
        return parseFloat(left) <= parseFloat(right);
      case 'exists':
      case 'truthy':
        return Boolean(leftValue && String(leftValue).length > 0);
      case 'empty':
      case 'falsy':
        return !leftValue || String(leftValue).trim().length === 0;
      default:
        return left === right;
    }
  }
}
