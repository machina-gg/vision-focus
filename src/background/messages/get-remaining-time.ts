import type { PlasmoMessaging } from '@plasmohq/messaging';

import { GetRemainingTimeBodySchema } from '~/types/messageSchemas';
import { getTimeLimitInfoForUrl } from '../time-limit';

// Message handler for getting remaining time for a URL
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const parsed = GetRemainingTimeBodySchema.safeParse(req.body);

  if (!parsed.success) {
    res.send({ success: false, error: 'Invalid URL' });
    return;
  }

  const { url } = parsed.data;

  const info = await getTimeLimitInfoForUrl(url);

  res.send({
    success: true,
    data: info
  });
};

export default handler;
