function cloneElementWithInlineStyles(source: HTMLElement) {
  const target = source.cloneNode(true) as HTMLElement;

  const copyStyles = (sourceNode: Element, targetNode: Element) => {
    const computedStyle = window.getComputedStyle(sourceNode);
    const targetElement = targetNode as HTMLElement;

    Array.from(computedStyle).forEach((property) => {
      targetElement.style.setProperty(
        property,
        computedStyle.getPropertyValue(property),
        computedStyle.getPropertyPriority(property),
      );
    });

    const sourceChildren = Array.from(sourceNode.children);
    const targetChildren = Array.from(targetNode.children);

    sourceChildren.forEach((child, index) => {
      const targetChild = targetChildren[index];
      if (targetChild) {
        copyStyles(child, targetChild);
      }
    });
  };

  copyStyles(source, target);
  return target;
}

async function renderElementToPngDataUrl(element: HTMLElement) {
  const width = element.scrollWidth;
  const height = element.scrollHeight;
  const clone = cloneElementWithInlineStyles(element);
  const serializedClone = new XMLSerializer().serializeToString(clone);
  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#ffffff;">
          ${serializedClone}
        </div>
      </foreignObject>
    </svg>
  `;
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('Unable to render order slip.'));
      nextImage.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    const scale = window.devicePixelRatio > 1 ? 2 : 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas is not available.');
    }

    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function downloadElementAsImage(element: HTMLElement, fileName: string) {
  const pngDataUrl = await renderElementToPngDataUrl(element);
  const downloadLink = document.createElement('a');
  downloadLink.href = pngDataUrl;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

export function saveElementAsPdf(element: HTMLElement, documentTitle: string) {
  const clonedElement = cloneElementWithInlineStyles(element);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=1200');

  if (!printWindow) {
    throw new Error('Unable to open the PDF preview window.');
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${documentTitle}</title>
        <style>
          body {
            margin: 0;
            padding: 24px;
            background: #f4f4f5;
            font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        ${clonedElement.outerHTML}
        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
