'use client';

import { BookOpen, CheckCircle2, ExternalLink, PlayCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type DocumentationSection = {
  title: string;
  items: string[];
};

type PageDocumentationContent = {
  title: string;
  description: string;
  sections: DocumentationSection[];
};

const DOCUMENTATION: Record<string, PageDocumentationContent> = {
  '/marketing-scenes': {
    title: 'Marketing Scenes',
    description: 'Turn your uploaded product or artwork into a realistic marketing scene.',
    sections: [
      { title: 'Choose your scene', items: ['Upload a product photo or finished artwork.', 'Choose Billboard, Transit lightbox, Magazine spread, Storefront window, or Scale stunt, then adjust the scene options.', 'Optionally add creative direction or exact visible wording.'] },
      { title: 'Generate your images', items: ['Select connected platforms. Generation costs 2 credits per platform.', 'Download the results or open the Media Library to schedule them.'] },
    ],
  },
  '/create-post': {
    title: 'Create Post',
    description: 'Create social content from your own idea, an image, or both.',
    sections: [
      {
        title: 'Create your content',
        items: [
          'Enter a prompt describing the post you want to create. You can also upload an image, or use an image without a prompt.',
          'SocioGenie analyses your image and combines it with your prompt when both are provided.',
          'Select any number of connected platforms. Content is adapted for each selected platform.',
        ],
      },
      {
        title: 'Schedule it',
        items: [
          'Schedule the generated content directly from this page by choosing a date and time.',
          'You can also leave it unscheduled and manage it later from the Media Library.',
        ],
      },
    ],
  },
  '/product-posts': {
    title: 'Product Posts',
    description: 'Turn a product image into an advertisement or a complete social post.',
    sections: [
      {
        title: 'Choose a generation mode',
        items: [
          'Advert mode creates a product advertisement without social research. An image is required, and an optional prompt can guide the result.',
          'Full social post creates a complete product post with advertising copy and social research. An image is required, and a prompt is optional.',
        ],
      },
      {
        title: 'Generate and schedule',
        items: [
          'Choose a preferred background or leave it blank so SocioGenie can select one.',
          'Select any number of platforms, generate the post, and schedule it when you are ready.',
        ],
      },
    ],
  },
  '/videos': {
    title: 'Videos',
    description: 'Create a square video from reference images and optional creative direction.',
    sections: [
      {
        title: 'Add references',
        items: [
          'Videos are generated in a 1:1 aspect ratio for all platforms.',
          'Normal mode supports up to 10 reference images. Rearrange them to control the order shown in the video.',
          'UGC mode supports one reference image and is designed for user-generated-style videos.',
          'In either mode, you can upload an image or select an existing image from the Media Library.',
        ],
      },
      {
        title: 'Guide and finish the video',
        items: [
          'Add optional video direction to describe the motion, mood, or story you want.',
          'Choose whether the logo appears at the beginning or end of the video.',
          'Select Create Video. Generation can take a few minutes. When it is ready, schedule the video for your preferred date and time.',
        ],
      },
    ],
  },
  '/campaigns': {
    title: 'Campaigns',
    description: 'Plan and generate a multi-day campaign from a campaign idea.',
    sections: [
      {
        title: 'Generate campaign ideas',
        items: [
          'Choose Learn from photos to upload 1–5 photos. SocioGenie creates three ideas and selects a photo for every campaign day. It may reuse photos or leave some unused.',
          'Choose Generate imagery to create one idea and AI visuals from your business data. Entering a campaign idea is required in this mode.',
          'Pick an idea to review and edit its day-by-day plan.',
        ],
      },
      {
        title: 'Build the campaign',
        items: [
          'Review the day-by-day plan and the brief description for each day.',
          'Choose the campaign start date. Use Autofill to populate consecutive dates, then adjust individual dates if needed.',
          'Select as many platforms as you want. Content is tailored to each selected platform.',
        ],
      },
      {
        title: 'Review drafts',
        items: [
          'Open Drafts to preview generated campaign content and schedule posts when ready.',
          'Drafts contains unscheduled campaigns, Scheduled contains scheduled content, and All contains both.',
          'The first regeneration of a draft is free. Each additional regeneration costs one credit.',
          'Return to the ideas list to choose another idea, generate a new set of ideas, or regenerate a specific idea.',
        ],
      },
    ],
  },
  '/carousel-posts': {
    title: 'Carousel Posts',
    description: 'Create a carousel with two to seven slides for one platform at a time.',
    sections: [
      {
        title: 'Create a carousel',
        items: [
          'Set the slide count between two and seven using the slider.',
          'Enter a topic to guide the generation, or leave it blank for SocioGenie to choose the direction.',
          'Optionally upload an image. SocioGenie uses it as a visual reference.',
          'Choose one platform for each carousel generation.',
        ],
      },
      {
        title: 'Preview and schedule',
        items: [
          'Preview every slide after generation and review the carousel before publishing.',
          'Schedule it by selecting a date and time. You can also schedule it later from the Media Library.',
          'The carousel is published to the selected platform at the date and time you choose.',
        ],
      },
    ],
  },
  '/schedule-post': {
    title: 'Schedule a Post',
    description: 'Schedule an image or video for one or more connected platforms.',
    sections: [
      {
        title: 'Prepare the post',
        items: [
          'Select an image or video to schedule.',
          'Write a caption manually, or use AI to generate a caption for the selected media.',
        ],
      },
      {
        title: 'Choose where and when to publish',
        items: [
          'Select as many connected platforms as you want.',
          'Choose the publication date and time. The content is published to each selected platform at that time.',
        ],
      },
    ],
  },
  '/upcoming-posts': {
    title: 'Upcoming Posts',
    description: 'Review and filter all scheduled posts in a calendar or list.',
    sections: [
      {
        title: 'Browse scheduled content',
        items: [
          'Switch between Calendar View and List View.',
          'Calendar View supports weekly and monthly layouts.',
          'Select any post to preview it and see its scheduled date, time, and current status.',
        ],
      },
      {
        title: 'Filter by status',
        items: [
          'All shows every post, regardless of status.',
          'Upcoming shows posts scheduled for a future date. Posted shows published posts.',
          'Removed shows posts removed by you or an administrator.',
          'Failed shows posts that could not be published. Rejected shows posts rejected by you or an administrator.',
          'The same filters are available in Calendar View.',
        ],
      },
    ],
  },
  '/media-library': {
    title: 'Media Library',
    description: 'Find every post generated in SocioGenie, whether scheduled or not.',
    sections: [
      {
        title: 'Browse generated content',
        items: [
          'Use the library to review generated posts, videos, carousels, and campaign content.',
          'Filter by the feature that generated the content: Create Post, Product Posts, Videos, Campaigns, Carousel, or AI Creator.',
          'Posts that are not scheduled can be scheduled later from the library.',
        ],
      },
    ],
  },
  '/connected-accounts': {
    title: 'Connected Accounts',
    description: 'Manage the social media accounts connected to SocioGenie.',
    sections: [
      {
        title: 'Manage connections',
        items: [
          'Check the connection status of each social media account.',
          'Open the social platform handler from this page when you need to manage the account there.',
          'Remove a connection whenever you want. You can reconnect the account later.',
        ],
      },
    ],
  },
  '/approval': {
    title: 'Approval',
    description: 'Review posts that require approval before they can be published.',
    sections: [
      {
        title: 'Approve or reject posts',
        items: [
          'Open a scheduled post to review its media, caption, platforms, and schedule.',
          'Approve a post to allow it to continue toward publication, or reject it when it needs changes.',
          'Rejected posts and posts that remain unapproved will not be published.',
        ],
      },
    ],
  },
};

const FALLBACK_DOCUMENTATION: PageDocumentationContent = {
  title: 'Documentation',
  description: 'Quick guidance for using SocioGenie.',
  sections: [
    {
      title: 'Need help?',
      items: [
        'Use the page tour in the sidebar when it is available.',
        'Visit Help & Support to contact the SocioGenie team with a question.',
      ],
    },
  ],
};

function getDocumentation(pathname: string | null) {
  if (!pathname) return FALLBACK_DOCUMENTATION;
  return DOCUMENTATION[pathname] ?? FALLBACK_DOCUMENTATION;
}

export function PageDocumentation() {
  const pathname = usePathname();
  const documentation = getDocumentation(pathname);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-full border-default bg-transparent px-3 text-secondary hover:bg-element hover:text-default"
          aria-label={`Open documentation for ${documentation.title}`}
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Documentation</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(88vh,760px)] max-w-2xl overflow-hidden p-0">
        <div className="flex max-h-[min(88vh,760px)] flex-col">
          <DialogHeader className="border-b border-default bg-subtle px-6 py-5 pr-12">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              <BookOpen className="h-4 w-4" aria-hidden />
              Help guide
            </div>
            <DialogTitle className="text-xl">{documentation.title}</DialogTitle>
            <DialogDescription>{documentation.description}</DialogDescription>
          </DialogHeader>
          <div className="custom-scrollbar overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {documentation.sections.map((section) => (
                <section key={section.title}>
                  <h3 className="mb-3 text-sm font-semibold text-default">{section.title}</h3>
                  <ul className="space-y-3">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-secondary">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div className="mt-7 flex items-center gap-3 rounded-2xl border border-dashed border-default bg-subtle px-4 py-3 text-sm text-secondary">
              <PlayCircle className="h-5 w-5 shrink-0 text-accent" aria-hidden />
              <span className="flex-1">Video walkthrough coming soon.</span>
              <ExternalLink className="h-4 w-4 shrink-0 text-tertiary" aria-hidden />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
