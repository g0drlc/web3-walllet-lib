import type { StyleFunctionProps } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
import {
  LEFT_SIDEBAR_WIDTH,
  RIGHT_SIDEBAR_WIDTH,
} from '@site/components/Layout/constants';

const fontFamily = `"Space Mono", monospace, sans-serif`;

export const styles = {
  global: (props: StyleFunctionProps) => ({
    body: {
      fontFamily,
    },
    'h1,h2,h3,h4,h5,h6': {
      fontFamily: `${fontFamily}!important`,
    },
    '.site-markdown': {
      h1: {
        mt: '4rem',
        mb: '2rem',
        lineHeight: 1.2,
        fontWeight: 'bold',
        fontSize: '2.2rem',
        letterSpacing: '-.025em',
      },
      h2: {
        mt: '4rem',
        mb: '0.5rem',
        lineHeight: 1.3,
        fontWeight: 'semibold',
        fontSize: '1.8rem',
        letterSpacing: '-.025em',
        '& + h3': {
          mt: '1.5rem',
        },
      },
      h3: {
        mt: '3rem',
        lineHeight: 1.25,
        fontWeight: 'semibold',
        fontSize: '1.4rem',
        letterSpacing: '-.025em',
      },
      h4: {
        mt: '3rem',
        lineHeight: 1.375,
        fontWeight: 'semibold',
        fontSize: '1.0rem',
      },
      a: {
        color: 'blue.500',
        fontStyle: 'italic',
        fontWeight: 'medium',
        transition: 'color 0.15s',
        transitionTimingFunction: 'ease-out',
        _hover: {
          color: 'red.500',
        },
      },
      p: {
        my: '1rem',
        lineHeight: 1.8,
      },
      ul: {
        mt: '0.5rem',
        ml: '1.25rem',
        'blockquote &': { mt: 0 },
        '& > * + *': {
          mt: '0.25rem',
        },
      },
      hr: {
        my: '4rem',
      },
      pre: {
        maxWidth: {
          // padding left [24px] -- LeftSideBar -- PaddingLeft [28px] --
          // [Content] -- PaddingRight [48px] -- RightSidebar -- PaddingRight [24px]
          base: `calc(100vw - 48px)`,
          lg: `calc(100vw - 96px - ${LEFT_SIDEBAR_WIDTH}px)`,
          xl: `calc(100vw - 96px - ${LEFT_SIDEBAR_WIDTH}px - ${RIGHT_SIDEBAR_WIDTH}px - 48px)`,
        },
      },
      [`p:not(.syntax-highlighter) > code`]: {
        bgColor: mode('gray.400', 'gray.600')(props),
        color: mode('white', 'gray.200')(props),
        borderRadius: '4px',
        fontWeight: 'semibold',
        transform: 'scale(0.9)',
        fontStyle: 'italic',
        px: 1,
      },
      blockquote: {
        bg: mode('gray.50', 'gray.700')(props),
        borderLeftWidth: '6px',
        color: mode('gray.600', 'gray.200')(props),
        p: '1rem',
        fontStyle: 'italic',
        my: '1.5rem',
        '&> p': {
          margin: 0,
        },
      },
    },
  }),
};
