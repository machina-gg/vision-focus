import type { PlasmoMessaging } from '@plasmohq/messaging';

import { getTimeLimitInfoForUrl } from '../time-limit';

// Message handler for getting remaining time for a URL
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { url } = req.body as { url: string };

  if (!url || typeof url !== 'string') {
    res.send({ success: false, error: 'Invalid URL' });
    return;
  }

  const info = await getTimeLimitInfoForUrl(url);

  res.send({
    success: true,
    data: info
  });
};

export default handler;
