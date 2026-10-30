import { useState } from 'react';
import { resolveImageUrl } from '../images/imageUrl';

export function AssetImage({ imageKey, name }: { imageKey: string | null; name: string }) {
  const url = resolveImageUrl(imageKey);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || failedUrl === url) {
    return (
      <span
        className="image-placeholder"
        role="img"
        aria-label={`${name}：画像未提供`}
        title="画像未提供"
      >
        —
      </span>
    );
  }
  return <img src={url} alt={name} onError={() => setFailedUrl(url)} />;
}
