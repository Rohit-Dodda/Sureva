// Fixed text-block geometry for badge cards.
//
// A badge's name and goal line vary from one word to a full sentence
// ("Highlander — 2,500 m elevation" vs "Hemisphere Hopper — Tracked in both
// hemispheres"). Left to wrap freely, a two-line card is taller than its
// neighbours, and because the galleries are flex-wrap grids the whole row
// stretches to the tallest card, leaving ragged gaps.
//
// So the text block is a fixed height sized for the worst case — two lines of
// name plus two of goal — with the content centred inside it. Every card is
// then identical whether its label runs to one line or four, and streak
// milestones line up with achievements in the shared grid on the Badges screen.

export const NAME_FONT_SIZE = 17;
export const NAME_LINE_HEIGHT = 21;
export const SUB_FONT_SIZE = 13;
export const SUB_LINE_HEIGHT = 17;
export const SUB_MARGIN_TOP = 3;

export const NAME_MAX_LINES = 2;
export const SUB_MAX_LINES = 2;

export const TEXT_BLOCK_HEIGHT =
  NAME_LINE_HEIGHT * NAME_MAX_LINES + SUB_MARGIN_TOP + SUB_LINE_HEIGHT * SUB_MAX_LINES;
