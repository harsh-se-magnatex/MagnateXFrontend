/**
 * Region-specific homepage copy.
 *
 * `/` is the global English site: USD, US spelling, occasions that travel.
 * `INDIA` keeps the original rupee copy so a regional `/in/` page can reuse
 * the same sections by passing `region={INDIA}` — sections never hardcode a
 * currency, a spelling or a festival list themselves.
 */

export type CostRow = {
  id: string;
  label: string;
  price: string;
  period: string;
  note: string;
  highlight?: boolean;
};

export type LandingRegion = {
  /** Eyebrow above the industry and occasion bands. */
  audience: string;
  industries: string[];
  occasions: string[];
  agencyCost: {
    /** Values that roll through the "An agency charges ___ a month" slot. */
    fees: string[];
    /** The gradient line under it. */
    startsAt: string;
    body: string;
    rows: CostRow[];
    footnote: string;
  };
  /** "the real necklace, frame or ___" in the pixel-lock card. */
  productExample: string;
  /** Where the marketing-visual scene is set. */
  sceneSetting: string;
};

const STUDIO_NOTE = 'Six AI tools. You create and schedule.';
const AI_MANAGER_NOTE = 'Plans, creates and publishes your month.';

export const GLOBAL: LandingRegion = {
  audience: 'Built for founder-led growing businesses',
  industries: [
    'Jewelry',
    'Fashion & boutiques',
    'Eyewear',
    'Beauty & salons',
    'Cafés & restaurants',
    'Specialty retail',
    'D2C brands',
    'Furniture',
    'Interiors',
    'Real estate',
  ],
  occasions: [
    'Black Friday',
    'Christmas',
    'New Year',
    "Valentine's Day",
    "Mother's Day",
    "Father's Day",
    'Back to school',
    'Halloween',
    'Diwali',
    'Eid',
    'Lunar New Year',
    'Wedding season',
    'New arrivals',
    'Weekend offers',
  ],
  agencyCost: {
    fees: ['$500', '$1,000', '$2,000'],
    startsAt: 'SocioGenie starts at $14.99.',
    body: 'Agencies post on their schedule. SocioGenie researches, writes, designs and publishes on yours — for a fraction of the cost.',
    rows: [
      {
        id: 'agency',
        label: 'Social media agency',
        price: '$500–2,000',
        period: 'per month',
        note: 'Posts when their calendar allows.',
      },
      {
        id: 'studio',
        label: 'SocioGenie Studio',
        price: '$14.99',
        period: 'per month',
        note: STUDIO_NOTE,
      },
      {
        id: 'ai-manager',
        label: 'SocioGenie AI Manager',
        price: '$49.99',
        period: 'per month, one platform',
        note: AI_MANAGER_NOTE,
        highlight: true,
      },
    ],
    footnote:
      'Billed monthly in USD. Agency range: a typical retainer for one growing brand.',
  },
  productExample: 'dress',
  sceneSetting: 'in a setting that fits your business',
};

export const INDIA: LandingRegion = {
  audience: 'Built for founder-led Indian businesses',
  industries: [
    'Imitation jewellery',
    'Fine jewellery',
    'Fashion & boutiques',
    'Ethnic wear',
    'Eyewear',
    'Specialty retail',
    'D2C brands',
    'Furniture',
    'Interiors',
    'Real estate',
  ],
  occasions: [
    'Diwali',
    'Dhanteras',
    'Navratri',
    'Karva Chauth',
    'Raksha Bandhan',
    'Akshaya Tritiya',
    'Wedding season',
    'Holi',
    'Ganesh Chaturthi',
    'Eid',
    'Christmas',
    'New Year',
    'Independence Day',
    'New arrivals',
    'Weekend offers',
  ],
  agencyCost: {
    fees: ['₹15,000', '₹25,000', '₹40,000'],
    startsAt: 'SocioGenie starts near ₹1,250.',
    body: 'Agencies post on their schedule. SocioGenie researches, writes, designs and publishes on yours — even in Diwali week.',
    rows: [
      {
        id: 'agency',
        label: 'Social media agency',
        price: '₹15,000–40,000',
        period: 'per month',
        note: 'Posts when their calendar allows.',
      },
      {
        id: 'studio',
        label: 'SocioGenie Studio',
        price: '≈ ₹1,250',
        period: 'per month · $14.99',
        note: STUDIO_NOTE,
      },
      {
        id: 'ai-manager',
        label: 'SocioGenie AI Manager',
        price: '≈ ₹4,200',
        period: 'per month · $49.99',
        note: AI_MANAGER_NOTE,
        highlight: true,
      },
    ],
    footnote:
      'Billed in USD via Dodo Payments; ₹ figures are approximate. Agency range: a typical retainer for one brand in India.',
  },
  productExample: 'kurti',
  sceneSetting: 'in an Indian city',
};
