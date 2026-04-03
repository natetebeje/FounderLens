-- Add sample lessons for the AI App Bootcamp
INSERT INTO public.build_lessons (
  track_id,
  title,
  slug,
  description,
  video_duration_minutes,
  sort_order,
  is_published,
  lesson_content
) VALUES 
(
  (SELECT id FROM public.build_tracks WHERE slug = 'saas-landing-page'),
  'Introduction to SaaS Development',
  'introduction-to-saas',
  'Learn the fundamentals of building a SaaS application and what we''ll cover in this bootcamp.',
  15,
  1,
  true,
  'Welcome to the AI App Bootcamp! In this lesson, we''ll cover the basics of SaaS development and outline our learning path.'
),
(
  (SELECT id FROM public.build_tracks WHERE slug = 'saas-landing-page'),
  'Setting Up Your Development Environment',
  'development-environment-setup',
  'Configure your local development environment with all the tools you''ll need.',
  25,
  2,
  true,
  'Let''s set up your development environment with Node.js, React, and other essential tools for modern web development.'
),
(
  (SELECT id FROM public.build_tracks WHERE slug = 'saas-landing-page'),
  'Building Your First Component',
  'first-component',
  'Create your first React component and understand the basics of component-based architecture.',
  20,
  3,
  true,
  'In this lesson, we''ll build your first React component and explore how components work together.'
);