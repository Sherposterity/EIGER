import { createCn } from 'cn/config'

// Class merging for shadcn/ui and our own components. The merge engine has to
// know the custom theme tokens in src/index.css, otherwise it mistakes
// `text-eyebrow` (a font size) for a text colour and drops the real colour.
// vite.config.js points every bare `import { cn } from "cn"` (which is what
// `shadcn add` writes) at this file, so registry components get it too.
export const cn = createCn({
  extend: {
    theme: {
      radius: ['pill'],
      spacing: ['section', 'section-sm', 'gutter'],
    },
    classGroups: {
      'font-size': [
        {
          text: [
            'display-xl',
            'display-lg',
            'display-md',
            'heading',
            'body-lg',
            'body',
            'small',
            'eyebrow',
          ],
        },
      ],
    },
  },
})
