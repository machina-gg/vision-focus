import { getMessage } from '~/lib/i18n';
import type { AddSiteRejection } from '~/lib/siteService';
import type { NestedSite } from '~/lib/siteKey';

function nestedSiteMessage(input: string, nested: NestedSite): string {
  const key =
    nested.relation === 'ancestor'
      ? 'siteErrorInsideTrackedSite'
      : 'siteErrorContainsTrackedSite';
  return getMessage(key, [input, nested.site]);
}

export function addSiteError(
  input: string,
  rejection: AddSiteRejection,
  duplicateMessage: string
): string {
  if (rejection.reason === 'nested') {
    return nestedSiteMessage(input, rejection.nested);
  }
  return rejection.reason === 'duplicate'
    ? duplicateMessage
    : 'Invalid domain format';
}
