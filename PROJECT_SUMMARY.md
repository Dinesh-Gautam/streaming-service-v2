# Project Summary

This document provides a comprehensive summary of the files within the Next.js movie search application.

---

## `.editorconfig`

**Path:** `.editorconfig`
**Content Summary:** Configuration file for maintaining consistent coding styles across different editors and IDEs. It defines rules for indentation, character set, end of line characters, and trimming whitespace.

## `.eslintrc.json`

**Path:** `.eslintrc.json`
**Content Summary:** ESLint configuration file. Extends `next/core-web-vitals`, indicating it sets up linting rules for a Next.js application with a focus on web vitals.

## `.gitignore`

**Path:** `.gitignore`
**Content Summary:** Specifies intentionally untracked files that Git should ignore. Includes common development artifacts like `node_modules`, build outputs (`.next/`, `out/`), temporary files, and local environment variables.

## `.prettierrc`

**Path:** `.prettierrc`
**Content Summary:** Prettier configuration file for code formatting. Defines rules such as using spaces for indentation, single quotes, trailing commas, semicolons, and a print width of 80 characters. It also includes a plugin for sorting imports.

## `components.json`

**Path:** `components.json`
**Content Summary:** Configuration file likely used by `shadcn/ui` for managing UI components. It defines the styling framework (`new-york`), component aliases, and paths for Tailwind CSS configuration and CSS files.

## `next.config.mjs`

**Path:** `next.config.mjs`
**Content Summary:** Next.js configuration file. It enables experimental server actions with a large body size limit, ignores TypeScript build and ESLint errors during builds, disables React strict mode, and configures remote image patterns for external hosts.

## `package.json`

**Path:** `package.json`
**Content Summary:** Project manifest file. Defines project metadata, scripts for development, build, linting, and formatting. Lists project dependencies including Next.js, React, various UI libraries (MUI, Radix UI), AI/media processing libraries (Deepgram, Genkit, fluent-ffmpeg, sharp), and development dependencies like ESLint, Prettier, and TypeScript.

## `pnpm-lock.yaml`

**Path:** `pnpm-lock.yaml`
**Content Summary:** PNPM lockfile. Records the exact versions and dependencies of all installed packages, ensuring consistent installations across different environments. It's a comprehensive manifest of the entire dependency tree.

## `postcss.config.js`

**Path:** `postcss.config.js`
**Content Summary:** PostCSS configuration file. It includes `@tailwindcss/postcss` as a plugin, indicating that Tailwind CSS is processed by PostCSS.

## `README.md`

**Path:** `README.md`
**Content Summary:** Project README file. Contains a caution warning that the code is in active development and not production-ready, advising use at one's own risk.

## `temp_transcoding.json`

**Path:** `temp_transcoding.json`
**Content Summary:** A JSON file containing metadata and results from a Deepgram transcription. It includes details about the audio (duration, channels, model used) and a full transcript with word-level timings and confidence scores, along with utterance-level breakdowns. This file appears to be a temporary output or a cached result of a media processing step.

## `temp_translations.json`

**Path:** `temp_translations.json`
**Content Summary:** A JSON file containing translated text, likely from a translation service. The content is a WebVTT format string, indicating it's a subtitle file translated into multiple languages (e.g., Hindi, Punjabi). This file seems to be a temporary output or a cached result of a translation process.

## `.vscode/settings.json`

**Path:** `.vscode/settings.json`
**Content Summary:** VS Code workspace settings. Configures the TypeScript SDK path to use the version installed in `node_modules`, ensuring consistent TypeScript language features within the editor.

## `public/next.svg`

**Path:** `public/next.svg`
**Content Summary:** An SVG image file containing the Next.js logo. Used for branding or as an icon in the public-facing part of the application.

## `public/vercel.svg`

**Path:** `public/vercel.svg`
**Content Summary:** An SVG image file containing the Vercel logo. Typically used for deployment branding or as an icon in Next.js applications.

## `public/uploads/ai-generated/backdrop-76d5faa1-6af3-4467-9b61-74d42aa8ff61.png`

**Path:** `public/uploads/ai-generated/backdrop-76d5faa1-6af3-4467-9b61-74d42aa8ff61.png`
**Content Summary:** A PNG image file, likely an AI-generated movie backdrop. This is a static asset used for display in the application.

## `public/uploads/ai-generated/poster-66cc3214-783b-4232-a14d-b3fa789cdfc5.png`

**Path:** `public/uploads/ai-generated/poster-66cc3214-783b-4232-a14d-b3fa789cdfc5.png`
**Content Summary:** A PNG image file, likely an AI-generated movie poster. This is a static asset used for display in the application.

## `src/admin/components/admin-sidebar.tsx`

**Path:** `src/admin/components/admin-sidebar.tsx`
**Content Summary:** React component for the admin sidebar. It uses Next.js's `usePathname` for active link highlighting and includes navigation links to the Dashboard, Users, and Movies sections. It also integrates a theme toggle.

## `src/admin/components/theme-provider.tsx`

**Path:** `src/admin/components/theme-provider.tsx`
**Content Summary:** React component that provides theme context to the application. It wraps the `next-themes` `ThemeProvider` to enable light/dark mode switching with system preference detection.

## `src/admin/components/theme-toggle.tsx`

**Path:** `src/admin/components/theme-toggle.tsx`
**Content Summary:** React component for toggling between light, dark, and system themes. It uses `next-themes` and Radix UI's `DropdownMenu` for its functionality and UI.

## `src/admin/components/ui/alert-dialog.tsx`

**Path:** `src/admin/components/ui/alert-dialog.tsx`
**Content Summary:** Reusable UI component for an alert dialog, built on top of Radix UI's `AlertDialogPrimitive`. It provides components for the dialog root, trigger, portal, overlay, content, header, footer, title, description, action, and cancel buttons, with Tailwind CSS for styling.

## `src/admin/components/ui/badge.tsx`

**Path:** `src/admin/components/ui/badge.tsx`
**Content Summary:** Reusable UI component for displaying badges, built using `class-variance-authority` for variant styling. It supports default, secondary, destructive, and outline variants, and can render as a `span` or a custom child component.

## `src/admin/components/ui/button.tsx`

**Path:** `src/admin/components/ui/button.tsx`
**Content Summary:** Reusable UI component for buttons, built using `class-variance-authority` for variant styling. It supports various visual styles (default, destructive, outline, secondary, ghost, link) and sizes (default, sm, lg, icon), and can render as a `button` or a custom child component.

## `src/admin/components/ui/card.tsx`

**Path:** `src/admin/components/ui/card.tsx`
**Content Summary:** Reusable UI component for cards, providing a structured layout with `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, and `CardFooter` sub-components. It uses Tailwind CSS for styling and layout.

## `src/admin/components/ui/checkbox.tsx`

**Path:** `src/admin/components/ui/checkbox.tsx`
**Content Summary:** Reusable UI component for a checkbox, built on top of Radix UI's `CheckboxPrimitive`. It includes a check icon from `lucide-react` and uses Tailwind CSS for styling, including states for checked, disabled, and invalid.

## `src/admin/components/ui/dropdown-menu.tsx`

**Path:** `src/admin/components/ui/dropdown-menu.tsx`
**Content Summary:** Reusable UI component for a dropdown menu, built on top of Radix UI's `DropdownMenuPrimitive`. It provides a comprehensive set of components for dropdown functionality, including trigger, content, groups, items, checkboxes, radio buttons, labels, separators, shortcuts, and sub-menus, with extensive Tailwind CSS styling.

## `src/admin/components/ui/form.tsx`

**Path:** `src/admin/components/ui/form.tsx`
**Content Summary:** Provides a set of React components for building forms, integrating with `react-hook-form` for form state management and validation. It includes `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, and `FormMessage` components, offering a structured way to create accessible and validated forms.

## `src/admin/components/ui/input.tsx`

**Path:** `src/admin/components/ui/input.tsx`
**Content Summary:** Reusable UI component for text input fields. It applies consistent styling using Tailwind CSS, including focus, disabled, and invalid states, and supports different input types.

## `src/admin/components/ui/label.tsx`

**Path:** `src/admin/components/ui/label.tsx`
**Content Summary:** Reusable UI component for form labels, built on top of Radix UI's `LabelPrimitive`. It provides consistent styling and accessibility features for associating labels with form controls.

## `src/admin/components/ui/progress.tsx`

**Path:** `src/admin/components/ui/progress.tsx`
**Content Summary:** Reusable UI component for a progress bar, built on top of Radix UI's `ProgressPrimitive`. It displays a visual indicator of progress with customizable styling and value.

## `src/admin/components/ui/select.tsx`

**Path:** `src/admin/components/ui/select.tsx`
**Content Summary:** Reusable UI component for a custom select dropdown, built on top of Radix UI's `SelectPrimitive`. It provides components for the select trigger, content, groups, items, labels, and scroll buttons, with extensive styling and accessibility features.

## `src/admin/components/ui/separator.tsx`

**Path:** `src/admin/components/ui/separator.tsx`
**Content Summary:** Reusable UI component for a visual separator, built on top of Radix UI's `SeparatorPrimitive`. It supports horizontal and vertical orientations and customizable styling.

## `src/admin/components/ui/sheet.tsx`

**Path:** `src/admin/components/ui/sheet.tsx`
**Content Summary:** Reusable UI component for a side sheet (drawer), built on top of Radix UI's `DialogPrimitive`. It provides components for the sheet root, trigger, close button, portal, overlay, content, header, footer, title, and description, with customizable side positioning and animation.

## `src/admin/components/ui/sidebar.tsx`

**Path:** `src/admin/components/ui/sidebar.tsx`
**Content Summary:** Comprehensive sidebar component with various states (expanded, collapsed, mobile offcanvas) and interactive elements. It includes a `SidebarProvider` for managing sidebar state, and sub-components for header, footer, content, menu items, and a rail for resizing. It integrates with `lucide-react` for icons and `next-themes` for theme toggling.

## `src/admin/components/ui/skeleton.tsx`

**Path:** `src/admin/components/ui/skeleton.tsx`
**Content Summary:** Reusable UI component for a skeleton loader. It provides a visual placeholder for content that is still loading, with a pulse animation and customizable styling.

## `src/admin/components/ui/sonner.tsx`

**Path:** `src/admin/components/ui/sonner.tsx`
**Content Summary:** Wrapper component for the `sonner` toast library. It integrates with `next-themes` to ensure the toast theme matches the application's current theme, providing a consistent notification experience.

## `src/admin/components/ui/table.tsx`

**Path:** `src/admin/components/ui/table.tsx`
**Content Summary:** Reusable UI components for building tables, including `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, and `TableCaption`. It provides basic table structure and styling with responsive overflow handling.

## `src/admin/components/ui/tabs.tsx`

**Path:** `src/admin/components/ui/tabs.tsx`
**Content Summary:** Reusable UI components for tabbed navigation, built on top of Radix UI's `TabsPrimitive`. It includes `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` components, providing accessible and customizable tab functionality.

## `src/admin/components/ui/textarea.tsx`

**Path:** `src/admin/components/ui/textarea.tsx`
**Content Summary:** Reusable UI component for a multi-line text input area. It applies consistent styling using Tailwind CSS, including focus, disabled, and invalid states.

## `src/admin/components/ui/tooltip.tsx`

**Path:** `src/admin/components/ui/tooltip.tsx`
**Content Summary:** Reusable UI components for tooltips, built on top of Radix UI's `TooltipPrimitive`. It includes `TooltipProvider`, `Tooltip`, `TooltipTrigger`, and `TooltipContent` components, providing accessible and customizable tooltip functionality with animation.

## `src/admin/hooks/use-mobile.ts`

**Path:** `src/admin/hooks/use-mobile.ts`
**Content Summary:** Custom React hook `useIsMobile` that detects if the current viewport width is below a defined mobile breakpoint (768px). It uses `window.matchMedia` and `useEffect` to update the `isMobile` state dynamically on window resize.

## `src/admin/lib/utils.ts`

**Path:** `src/admin/lib/utils.ts`
**Content Summary:** Utility file containing helper functions. The primary function `cn` is used for conditionally joining Tailwind CSS classes, combining `clsx` and `tailwind-merge` for efficient and conflict-free class management.

## `src/app/(admin)/admin/layout.tsx`

**Path:** `src/app/(admin)/admin/layout.tsx`
**Content Summary:** Root layout component for the admin section of the application. It sets up the basic HTML structure, imports global admin CSS, and integrates `ThemeProvider` and `SidebarProvider` to provide theming and sidebar functionality across all admin pages.

## `src/app/(admin)/admin/page.tsx`

**Path:** `src/app/(admin)/admin/page.tsx`
**Content Summary:** Dashboard page for the admin panel. It displays summary cards for "Total Users" and "Total Movies" with mock data and uses UI components like `Card`, `CardHeader`, `CardTitle`, and `CardContent` from the admin UI library.

## `src/app/(admin)/admin/movies/_action.tsx`

**Path:** `src/app/(admin)/admin/movies/_action.tsx`
**Content Summary:** Server actions for movie management. It handles file uploads (`uploadAction`), initiates video processing (`processVideo`) using various media engines (Thumbnail, Transcoding, Subtitle, AI), fetches media processing job statuses (`getMediaProcessingJob`), saves movie data to the database (`saveMovieData`), deletes movies (`deleteMovie`), applies AI suggestions (`applyAISuggestions`), and generates AI images (`generateAIImagesWithPrompt`, `suggestImagePrompt`). It interacts with MongoDB and external AI/media processing services.

## `src/app/(admin)/admin/movies/delete-movie-dialog.tsx`

**Path:** `src/app/(admin)/admin/movies/delete-movie-dialog.tsx`
**Content Summary:** React component for a confirmation dialog used before deleting a movie. It utilizes the `AlertDialog` UI component from the admin UI library to display a warning message and provides confirm/cancel actions.

## `src/app/(admin)/admin/movies/movies-table.tsx`

**Path:** `src/app/(admin)/admin/movies/movies-table.tsx`
**Content Summary:** React component for displaying a table of movies in the admin panel. It fetches movie data, manages movie deletion, and displays transcoding progress for each movie by polling media processing job statuses. It includes UI components like `Table`, `Badge`, `Button`, `DropdownMenu`, and `Tooltip`.

## `src/app/(admin)/admin/movies/page.tsx`

**Path:** `src/app/(admin)/admin/movies/page.tsx`
**Content Summary:** Page for managing movies in the admin panel. It fetches all movies from the database and renders them using the `MoviesTable` component. It also provides a button to navigate to the "Add Movie" page.

## `src/app/(admin)/admin/movies/[id]/edit-movie.tsx`

**Path:** `src/app/(admin)/admin/movies/[id]/edit-movie.tsx`
**Content Summary:** React component for editing or creating movie entries in the admin panel. It uses `react-hook-form` for form management, integrates with AI features for generating movie details and images, handles media uploads (video, poster, backdrop), and displays media processing progress. It includes various UI components for form inputs, tabs, and media previews.

## `src/app/(admin)/admin/movies/[id]/page.tsx`

**Path:** `src/app/(admin)/admin/movies/[id]/page.tsx`
**Content Summary:** Dynamic page for editing a specific movie or creating a new one. It fetches movie data based on the `id` parameter and passes it to the `EditMoviePage` component. If the `id` is 'new', it indicates a new movie creation.

## `src/app/(admin)/admin/movies/[id]/components/MediaUploadSection.tsx`

**Path:** `src/app/(admin)/admin/movies/[id]/components/MediaUploadSection.tsx`
**Content Summary:** Reusable React component for handling media uploads (video, poster, backdrop). It provides an input field for file selection, displays upload progress, and shows a preview of the uploaded media. It supports different media types and integrates with `Input` and `Progress` UI components.

## `src/app/(admin)/admin/movies/[id]/components/SegmentedProgressBar.tsx`

**Path:** `src/app/(admin)/admin/movies/[id]/components/SegmentedProgressBar.tsx`
**Content Summary:** React component that displays the progress of media processing tasks using a segmented progress bar. It visualizes the status and progress of individual engines (AI, Subtitle, Transcoding, Thumbnail) within a larger job, providing clear visual feedback on the media processing pipeline.

## `src/app/(admin)/admin/users/_actions.tsx`

**Path:** `src/app/(admin)/admin/users/_actions.tsx`
**Content Summary:** Server actions for user management. It provides functions to create, update, and delete users by interacting with the database. It uses a `userAction` function to dispatch different operations based on the provided action type.

## `src/app/(admin)/admin/users/delete-user-dialog.tsx`

**Path:** `src/app/(admin)/admin/users/delete-user-dialog.tsx`
**Content Summary:** React component for a confirmation dialog used before deleting a user. It utilizes the `AlertDialog` UI component from the admin UI library to display a warning message and provides confirm/cancel actions.

## `src/app/(admin)/admin/users/page.tsx`

**Path:** `src/app/(admin)/admin/users/page.tsx`
**Content Summary:** Page for managing users in the admin panel. It fetches all user data from the database and displays it using the `UsersTable` component. It also provides a button to navigate to the "Add User" page.

## `src/app/(admin)/admin/users/users-table.tsx`

**Path:** `src/app/(admin)/admin/users/users-table.tsx`
**Content Summary:** React component for displaying a table of users in the admin panel. It fetches user data, manages user deletion, and displays user information such as name, email, creation date, and role. It includes UI components like `Table`, `Button`, and `DropdownMenu`.

## `src/app/(admin)/admin/users/[id]/edit-user.tsx`

**Path:** `src/app/(admin)/admin/users/[id]/edit-user.tsx`
**Content Summary:** React component for editing or creating user accounts in the admin panel. It uses `react-hook-form` for form management and interacts with server actions to save user data. It includes various UI components for form inputs and selection.

## `src/app/(admin)/admin/users/[id]/page.tsx`

**Path:** `src/app/(admin)/admin/users/[id]/page.tsx`
**Content Summary:** Dynamic page for editing a specific user or creating a new one. It fetches user data based on the `id` parameter and passes it to the `EditUser` component. If the `id` is 'new`, it indicates a new user creation.

## `src/app/(public)/layout.tsx`

**Path:** `src/app/(public)/layout.tsx`
**Content Summary:** Root layout component for the public-facing section of the application. It sets up the basic HTML structure, imports global SCSS styles, and integrates `AuthProvider` and `BannerProvider` to provide authentication and banner context across all public pages. It also includes a `Toaster` for notifications.

## `src/app/(public)/page.tsx`

**Path:** `src/app/(public)/page.tsx`
**Content Summary:** Home page of the public-facing application. It fetches various movie and TV show data from TMDB and a custom original movies source. It displays a `PopularMoviesBanner` and multiple `Slider` components to showcase different categories of content. It uses `HoverCardProvider` for interactive movie cards.

## `src/app/(public)/[...nextauth]/route.ts`

**Path:** `src/app/(public)/[...nextauth]/route.ts`
**Content Summary:** NextAuth.js configuration file for authentication. It defines authentication options, session strategy (JWT), and uses `Credentials` provider for email/password login. It includes a `verifyUser` function to authenticate against the MongoDB `User` schema and sets up JWT callbacks for role management.

## `src/app/(public)/play/[id]/dynamic.tsx`

**Path:** `src/app/(public)/play/[id]/dynamic.tsx`
**Content Summary:** Client-side dynamic import for the video player component. It uses `next/dynamic` to import the `Player` component with `ssr: false`, ensuring it's only rendered on the client-side.

## `src/app/(public)/play/[id]/page.tsx`

**Path:** `src/app/(public)/play/[id]/page.tsx`
**Content Summary:** Dynamic page for playing a specific movie. It fetches movie details from the database based on the `id` parameter and passes the data to the `DynamicPlayer` component for rendering the video player.

## `src/app/(public)/play/[id]/player.tsx`

**Path:** `src/app/(public)/play/[id]/player.tsx`
**Content Summary:** React component for the video player, built using `@vidstack/react`. It displays movie content, including playback URL, subtitles (original and AI-generated), chapters, and thumbnails. It uses `useRef` to manage the media player instance and integrates with Vidstack's default video layout.

## `src/app/(public)/search/[query]/page.tsx`

**Path:** `src/app/(public)/search/[query]/page.tsx`
**Content Summary:** Dynamic page for displaying search results. It fetches search results from TMDB based on the `query` parameter and maps them to include genre information. It renders the `SearchResult` component to display the filtered content.

## `src/app/(public)/signin/page.tsx`

**Path:** `src/app/(public)/signin/page.tsx`
**Content Summary:** Sign-in page for user authentication. It includes a `SignInForm` component that handles user input, calls `next-auth`'s `signIn` function, and manages error states. It also provides a link to the sign-up page.

## `src/app/(public)/signup/_action.tsx`

**Path:** `src/app/(public)/signup/_action.tsx`
**Content Summary:** Server action for user sign-up. It handles user registration by checking for existing users, hashing passwords using `bcrypt`, and saving new user data to the MongoDB `User` schema.

## `src/app/(public)/signup/page.tsx`

**Path:** `src/app/(public)/signup/page.tsx`
**Content Summary:** Sign-up page for new user registration. It manages user input for name, email, password, and confirm password. It calls the `signUpUser` server action to create a new user and handles password matching and error display.

## `src/app/(public)/signup/types.ts`

**Path:** `src/app/(public)/signup/types.ts`
**Content Summary:** TypeScript type definition file. It defines the `SignUpUserProps` type, which specifies the expected properties (email, password, name) for user registration.

## `src/app/(public)/title/[type]/[id]/page.tsx`

**Path:** `src/app/(public)/title/[type]/[id]/page.tsx`
**Content Summary:** Dynamic page for displaying detailed information about a movie or TV show. It fetches content details from TMDB or a custom original movie source based on `id` and `type` parameters. It renders the `TitleView` component to display the content and integrates with `YoutubeVideoPlayerProvider`.

## `src/app/api/auth/[...nextauth]/route.ts`

**Path:** `src/app/api/auth/[...nextauth]/route.ts`
**Content Summary:** NextAuth.js API route for authentication. It re-exports the `handler` from `src/app/(public)/[...nextauth]/route.ts`, making the authentication endpoints available under `/api/auth`.

## `src/app/api/static/[...file]/route.ts`

**Path:** `src/app/api/static/[...file]/route.ts`
**Content Summary:** Next.js API route for serving static files, including video segments and images. It handles `GET` requests, supports byte range requests for video streaming, and reads files from `tmp` or `converted` directories.

## `src/components/fade-image-on-load.tsx`

**Path:** `src/components/fade-image-on-load.tsx`
**Content Summary:** React component that provides a fade-in animation for images once they are loaded. It uses `motion/react` for animations and can optionally display a loading background and an ambient glow effect for images.

## `src/components/fade-on-load.tsx`

**Path:** `src/components/fade-on-load.tsx`
**Content Summary:** Simple React component that applies a fade-in animation to its children when mounted. It uses `motion/react` for the animation effect.

## `src/components/suspense-loading.tsx`

**Path:** `src/components/suspense-loading.tsx`
**Content Summary:** React component that provides a visual loading indicator, typically used with React's Suspense. It displays a pulsating background with a blurred effect, indicating that content is being loaded.

## `src/components/elements/custom-select.tsx`

**Path:** `src/components/elements/custom-select.tsx`
**Content Summary:** Custom React select component. It provides a dropdown menu with customizable options, handles option selection, and manages its open/close state. It uses `motion/react` for animations and SCSS modules for styling.

## `src/components/elements/separator.tsx`

**Path:** `src/components/elements/separator.tsx`
**Content Summary:** React component that displays a list of values separated by a vertical line. It's used to visually separate information, such as movie genres or release dates, with customizable spacing.

## `src/components/home/banner.tsx`

**Path:** `src/components/home/banner.tsx`
**Content Summary:** React component for the main banner on the home page. It displays a rotating carousel of popular movies with background images, titles, and video controls. It uses `motion/react` for animations, `useBanner` context for state management, and integrates with the YouTube video player.

## `src/components/home/slider.tsx`

**Path:** `src/components/home/slider.tsx`
**Content Summary:** React component for a horizontal content slider. It displays a list of movies or TV shows with infinite scrolling functionality and navigation arrows. It uses `useRef` and `useState` for managing scroll position and responsiveness, and `FadeImageOnLoad` for image loading.

## `src/components/hover-card/card.tsx`

**Path:** `src/components/hover-card/card.tsx`
**Content Summary:** React component for a hover card that displays detailed information about a movie or TV show when hovered over. It uses `motion/react` for animations, fetches movie details, and includes a YouTube video player preview. It displays information like title, rating, release year, and language.

## `src/components/hover-card/provider.tsx`

**Path:** `src/components/hover-card/provider.tsx`
**Content Summary:** React context provider for managing the state and behavior of hover cards across the application. It tracks the position and active state of the hover card, handles hover events, and provides data to the `HoverCard` component.

## `src/components/hover-card/types.ts`

**Path:** `src/components/hover-card/types.ts`
**Content Summary:** TypeScript type definition file for hover card components. It defines types for `sliderResults` (various movie/TV show data structures), `HoverCardProviderProps` (props for the provider component), and `hoverCardPositionState` (state for the hover card's position and active status).

## `src/components/magicui/shine-border.tsx`

**Path:** `src/components/magicui/shine-border.tsx`
**Content Summary:** React component that creates an animated border effect with a "shine" animation. It uses CSS `background-image` and `mask` properties to achieve the effect, with customizable border width, duration, and shine colors.

## `src/components/magicui/text-animate.tsx`

**Path:** `src/components/magicui/text-animate.tsx`
**Content Summary:** React component for animating text. It can split text by word, character, or line and apply various animation presets (fade in, blur in, slide, scale). It uses `motion/react` for animations and supports custom variants and viewport-based animation triggers.

## `src/components/nav/index.tsx`

**Path:** `src/components/nav/index.tsx`
**Content Summary:** Navigation bar component for the application. It includes a search bar, user authentication status, and a dropdown menu for authenticated users with options for sign-out and admin access. It uses `next-auth` for session management and `motion/react` for animations.

## `src/components/search/_action.tsx`

**Path:** `src/components/search/_action.tsx`
**Content Summary:** Server action for search suggestions. It calls the `cachedMultiSearch` function from the TMDB API to fetch search results based on a query and returns them.

## `src/components/search/index.tsx`

**Path:** `src/components/search/index.tsx`
**Content Summary:** Search bar component. It handles user input, debounces search queries, fetches search suggestions using a server action, and displays them in a dropdown. It uses `useData` context for state management and `motion/react` for animations.

## `src/components/search/search-result.tsx`

**Path:** `src/components/search/search-result.tsx`
**Content Summary:** React component for displaying search results. It renders a list of movie or TV show items, each with a poster, title, media type, genres, and a brief overview. It uses `motion/react` for hover animations and `FadeImageOnLoad` for image loading.

## `src/components/search/search-suggestions.tsx`

**Path:** `src/components/search/search-suggestions.tsx`
**Content Summary:** React component for displaying search suggestions in a dropdown. It takes an array of search results and renders them as clickable links, showing a small image, title, and release year. It uses `motion/react` for animations and `FadeImageOnLoad` for image loading.

## `src/components/title/_action.tsx`

**Path:** `src/components/title/_action.tsx`
**Content Summary:** Server action for fetching TV season information. It uses `unstable_cache` from Next.js to cache the results of `cachedTvSeasonInfo` from the TMDB API, improving performance for repeated requests.

## `src/components/title/index.tsx`

**Path:** `src/components/title/index.tsx`
**Content Summary:** Main component for displaying detailed information about a movie or TV show. It includes the title, separated info (genres, release date), a clickable description for more details, and buttons for playback. For TV shows, it displays season and episode information. It integrates with the YouTube video player and uses `motion/react` for various animations.

## `src/components/title/more-info.tsx`

**Path:** `src/components/title/more-info.tsx`
**Content Summary:** React component that displays additional detailed information about a movie or TV show, such as production details, languages, links to streaming providers, and user reviews. It fetches this extended data from a custom API endpoint.

## `src/components/title/types.ts`

**Path:** `src/components/title/types.ts`
**Content Summary:** This file is empty. It was likely intended for type definitions related to the title components but is currently unused.

## `src/components/utils/paragraph.tsx`

**Path:** `src/components/utils/paragraph.tsx`
**Content Summary:** React component for formatting paragraphs. It truncates long paragraphs to a specified word limit and provides a "click to read more" functionality.

## `src/components/youtube/_actions.ts`

**Path:** `src/components/youtube/_actions.ts`
**Content Summary:** Server action for fetching YouTube video data (trailers) for movies and TV shows. It uses `unstable_cache` from Next.js to cache the results of `cachedGetMoviesVideos` and `cachedGetTvVideos` from the TMDB API.

## `src/components/youtube/context.tsx`

**Path:** `src/components/youtube/context.tsx`
**Content Summary:** React context provider for managing the state of the YouTube video player. It provides access to the YouTube player instance, playback state (playing, muted), video data, and player readiness status to child components. It fetches video data using `getTitleTrailerVideos`.

## `src/components/youtube/controls.tsx`

**Path:** `src/components/youtube/controls.tsx`
**Content Summary:** React component for YouTube video player controls (play/pause, mute/unmute). It interacts with the YouTube player instance via the `useYoutubePlayer` context and updates the player state. It uses `motion/react` for button animations.

## `src/components/youtube/custom-element.d.ts`

**Path:** `src/components/youtube/custom-element.d.ts`
**Content Summary:** TypeScript declaration file for the `lite-youtube` custom element. It defines the JSX intrinsic elements for `lite-youtube` and declares the `LiteYTEmbed` class, providing type information for its properties and methods.

## `src/components/youtube/index.ts`

**Path:** `src/components/youtube/index.ts`
**Content Summary:** Entry point for YouTube video player components. It dynamically imports the `YoutubeVideoPlayer` component (client-side only) and exports the `YoutubeVideoPlayerProvider` and `YoutubeControlButtons` components.

## `src/components/youtube/player.tsx`

**Path:** `src/components/youtube/player.tsx`
**Content Summary:** React component that renders the `lite-youtube` custom element for embedding YouTube videos. It manages the YouTube player's lifecycle, sets up initial playback state, and interacts with the `useYoutubePlayer` context.

## `src/components/youtube/types.ts`

**Path:** `src/components/youtube/types.ts`
**Content Summary:** TypeScript type definition file for YouTube video player components. It defines interfaces for `VideoData`, `PlayerState`, `VideoPlayerContextProps`, and `YoutubeVideoPlayerProviderProps`, specifying the data structures and props used within the YouTube player context.

## `src/constants/config.ts`

**Path:** `src/constants/config.ts`
**Content Summary:** Configuration file for application-wide constants. It defines `DEFAULT_PAGE_REVALIDATION_TIME` (1 day) and `TMDB_IMAGE_URL` for constructing image URLs from TMDB.

## `src/constants/paths.ts`

**Path:** `src/constants/paths.ts`
**Content Summary:** Defines all application routes and paths as constants. It includes paths for public pages (home, title, sign-in, sign-up) and admin pages (dashboard, users, movies, new movie/user), promoting consistency and ease of maintenance.

## `src/constants/sliders.ts`

**Path:** `src/constants/sliders.ts`
**Content Summary:** Defines constants for different content sliders used on the home page. It includes `SLIDERS` (e.g., Originals, Popular Movies, Trending) and `SLIDER_TITLES` for their display names.

## `src/context/auth-context.tsx`

**Path:** `src/context/auth-context.tsx`
**Content Summary:** React context provider for authentication. It re-exports `SessionProvider` from `next-auth/react` as `AuthProvider`, making the NextAuth.js session available throughout the application.

## `src/context/banner-context.tsx`

**Path:** `src/context/banner-context.tsx`
**Content Summary:** React context provider for managing the state of the main banner carousel. It provides `currentIndex` and `setCurrentIndex` to child components, allowing them to control and react to the active banner slide.

## `src/context/state-context.tsx`

**Path:** `src/context/state-context.tsx`
**Content Summary:** Global React context provider for managing application-wide state, particularly for search functionality. It uses `useReducer` for state management and provides `search` and `searchSuggestions` data, along with dispatch functions to update them. It also manages video and more info data.

## `src/lib/types.ts`

**Path:** `src/lib/types.ts`
**Content Summary:** TypeScript type definition file for common application types. It defines `MediaType` ('movie' or 'tv') and `USER_ROLES` (admin, user), along with the `User` interface for user data.

## `src/lib/ai/flow.ts`

**Path:** `src/lib/ai/flow.ts`
**Content Summary:** Defines Genkit AI flows for video analysis and image generation. `VideoAnalysisFlow` processes video files to extract metadata, chapters, and translated subtitles. `GenerateMovieImagesFlow` creates image generation prompts and generates poster/backdrop images using AI models. It uses Zod for schema validation and interacts with Google Cloud services (Vertex AI, TTS).

## `src/lib/ai/images.ts`

**Path:** `src/lib/ai/images.ts`
**Content Summary:** Provides functions for AI image generation and prompt suggestion. `generateImageWithPrompt` uses an AI model (Imagen) to generate images based on a given prompt and saves them to a temporary directory. `generateImagePrompt` uses an AI model (Gemini) to suggest or enhance image prompts based on movie details.

## `src/lib/media/engine-outputs.ts`

**Path:** `src/lib/media/engine-outputs.ts`
**Content Summary:** TypeScript interfaces defining the standardized output structures for various media processing engines. It includes interfaces for `SubtitleOutputData`, `ThumbnailOutputData`, `TranscodingOutputData`, and `AIEngineOutputData`, along with a union type `EngineTaskOutput` for all possible engine outputs.

## `src/lib/media/media-engine.ts`

**Path:** `src/lib/media/media-engine.ts`
**Content Summary:** Abstract base class `MediaEngine` for all media processing engines. It provides common properties (status, progress, error message) and methods (`process`, `getStatus`, `getProgress`, `getErrorMessage`, `updateStatus`, `updateProgress`, `fail`, `complete`). It extends `EventEmitter` for event-driven communication.

## `src/lib/media/media-manager.ts`

**Path:** `src/lib/media/media-manager.ts`
**Content Summary:** Manages the media processing pipeline by orchestrating various `MediaEngine` instances. It ensures engines run in the correct order based on dependencies, tracks job and task statuses in a MongoDB database (`MediaProcessingJob`), and handles retries for failed tasks.

## `src/lib/media/engines/ai-engine.ts`

**Path:** `src/lib/media/engines/ai-engine.ts`
**Content Summary:** Media engine responsible for AI-driven video analysis and audio dubbing. It uses Genkit flows to extract metadata, generate chapters and translated subtitles, and create dubbed audio tracks by performing vocal removal and text-to-speech synthesis. It interacts with Google Cloud TTS and external vocal remover tools.

## `src/lib/media/engines/subtitle.ts`

**Path:** `src/lib/media/engines/subtitle.ts`
**Content Summary:** Media engine for audio transcription and subtitle generation/translation. It extracts audio from video, transcribes it using Deepgram, generates WebVTT files for the source language, and translates them into target languages using Google Translate.

## `src/lib/media/engines/thumbnail-engine.ts`

**Path:** `src/lib/media/engines/thumbnail-engine.ts`
**Content Summary:** Media engine for generating video thumbnails and a corresponding WebVTT file. It extracts frames from a video at specified intervals, scales them, and creates a VTT file that links timecodes to the generated thumbnail images.

## `src/lib/media/engines/transcoding-engine.ts`

**Path:** `src/lib/media/engines/transcoding-engine.ts`
**Content Summary:** Media engine for video transcoding into DASH (Dynamic Adaptive Streaming over HTTP) format. It uses `fluent-ffmpeg` to convert input video into multiple resolutions and segment it for adaptive streaming. It can also incorporate AI-dubbed audio tracks into the output manifest.

## `src/lib/validation/schemas.ts`

**Path:** `src/lib/validation/schemas.ts`
**Content Summary:** Defines Zod schemas for data validation. It includes `UserSchema` for user data (name, email, role, password) and `MovieSchema` for movie data (title, description, year, genres, status, media paths). `MovieSchema` includes refinements to ensure all necessary fields are present when a movie is published.

## `src/server/tmdb.ts`

**Path:** `src/server/tmdb.ts`
**Content Summary:** Provides cached functions for interacting with The Movie Database (TMDB) API. It uses `tmdb-js-web` to fetch popular movies, now playing movies, trending content, movie/TV videos, multi-search results, movie/TV details, TV season info, and genre lists. Caching is implemented using `next/cache` and a custom `createCachedFunction` utility.

## `src/server/utils.ts`

**Path:** `src/server/utils.ts`
**Content Summary:** Utility file for server-side functions. It provides a `createCachedFunction` helper that wraps any asynchronous method with `react`'s `cache` function, enabling memoization of function results for improved performance.

## `src/server/db/connect.ts`

**Path:** `src/server/db/connect.ts`
**Content Summary:** Establishes and manages the MongoDB database connection using Mongoose. It implements a caching mechanism to reuse existing connections, preventing multiple connections during hot reloads in development.

## `src/server/db/movies.ts`

**Path:** `src/server/db/movies.ts`
**Content Summary:** Provides functions for interacting with the MongoDB `Movie` collection. It includes `getOriginalMovies` to fetch a list of movies for display and `getOriginalMovieDetail` to retrieve detailed information about a specific movie, including its media processing job status and generated assets (subtitles, thumbnails, playback URLs, dubbed audio).

## `src/server/db/users.ts`

**Path:** `src/server/db/users.ts`
**Content Summary:** Provides functions for interacting with the MongoDB `User` collection. It includes `getAllUsers` to retrieve a list of users, `updateUser` to modify existing user data, `createUser` to add new users (with password hashing), `deleteUser` to remove users, and `getUserById` to fetch a single user's details.

## `src/server/db/schemas/media-processing.ts`

**Path:** `src/server/db/schemas/media-processing.ts`
**Content Summary:** Defines Mongoose schemas for tracking media processing jobs. It includes `MediaProcessingTaskSchema` for individual tasks (e.g., transcription, transcoding) and `MediaProcessingJobSchema` for the overall job, which contains an array of tasks. It tracks status, progress, errors, and output for each task.

## `src/server/db/schemas/movie.ts`

**Path:** `src/server/db/schemas/movie.ts`
**Content Summary:** Defines the Mongoose schema for movie data. It includes fields for title, description, year, genres, status (Draft/Published), media paths (video, poster, backdrop), and a flag for AI-generated content. It also exports a `TranscodingProgress` schema, though its usage might be deprecated or replaced by `MediaProcessingJob`.

## `src/server/db/schemas/user.ts`

**Path:** `src/server/db/schemas/user.ts`
**Content Summary:** Defines the Mongoose schema for user data. It includes fields for name, email, hashed password, creation date, and role. It ensures email uniqueness and sets a default role of 'user'.

## `src/styles/admin.css`

**Path:** `src/styles/admin.css`
**Content Summary:** Main CSS file for the admin panel. It imports Tailwind CSS and `tw-animate-css`, and defines custom CSS variables for theming (light and dark modes) using Oklch color space. It also includes base styles for elements.

## `src/styles/global.scss`

**Path:** `src/styles/global.scss`
**Content Summary:** Global SCSS file for the public-facing application. It defines universal styles for HTML, body, links, inputs, buttons, and headings. It sets up basic typography, background color, and ensures consistent box-sizing.

## `src/styles/modules/auth.module.scss`

**Path:** `src/styles/modules/auth.module.scss`
**Content Summary:** SCSS module for styling authentication-related components (sign-in, sign-up forms). It defines styles for containers, input fields, form layouts, and a submit button, with responsive adjustments.

## `src/styles/modules/banner.module.scss`

**Path:** `src/styles/modules/banner.module.scss`
**Content Summary:** SCSS module for styling the main banner component. It defines layout, positioning, and animation for banner slides, including background images, video controls, and navigation buttons. It uses mixins for responsive design.

## `src/styles/modules/custom-select.module.scss`

**Path:** `src/styles/modules/custom-select.module.scss`
**Content Summary:** SCSS module for styling the custom select dropdown component. It defines styles for the select container, dropdown arrow, option container, and individual options, including hover effects and scrollbar styling.

## `src/styles/modules/nav.module.scss`

**Path:** `src/styles/modules/nav.module.scss`
**Content Summary:** SCSS module for styling the navigation bar. It defines layout for the navigation elements, search bar, and user-related components (avatar, user modal), including responsive adjustments and animations for the user modal.

## `src/styles/modules/search-result.module.scss`

**Path:** `src/styles/modules/search-result.module.scss`
**Content Summary:** SCSS module for styling search result items. It defines the layout and appearance of individual search results, including image containers, info sections, and background images, with responsive adjustments and hover effects.

## `src/styles/modules/search.module.scss`

**Path:** `src/styles/modules/search.module.scss`
**Content Summary:** SCSS module for styling the search bar and search suggestions. It defines the layout and appearance of the search input, clear button, search button, and the dropdown container for suggestions, including animations and scrollbar styling.

## `src/styles/modules/separator.module.scss`

**Path:** `src/styles/modules/separator.module.scss`
**Content Summary:** SCSS module for styling the separator component. It defines the visual appearance of the separator line used to divide content elements, with customizable spacing.

## `src/styles/modules/slider.module.scss`

**Path:** `src/styles/modules/slider.module.scss`
**Content Summary:** SCSS module for styling the horizontal content slider. It defines the layout, positioning, and animation for slider items, including image containers, movie names, and navigation buttons. It uses mixins for responsive adjustments based on screen size.

## `src/styles/modules/title.module.scss`

**Path:** `src/styles/modules/title.module.scss`
**Content Summary:** SCSS module for styling the movie/TV show title details page. It defines styles for the backdrop image (blurred and unblurred), the main content container, title, description, buttons, and season/episode drawers. It uses mixins for responsive design and animations.

## `src/styles/modules/youtubeControlButtons.module.scss`

**Path:** `src/styles/modules/youtubeControlButtons.module.scss`
**Content Summary:** SCSS module for styling YouTube video player control buttons (play/pause, mute/unmute). It defines the layout and appearance of these buttons, including their size and hover effects.

## `src/styles/modules/youtubePlayer.module.scss`

**Path:** `src/styles/modules/youtubePlayer.module.scss`
**Content Summary:** SCSS module for styling the YouTube video player container. It defines the positioning, size, and visual appearance of the embedded YouTube player, including handling overflow and transitions.

## `src/styles/utils/_mixins.scss`

**Path:** `src/styles/utils/_mixins.scss`
**Content Summary:** SCSS file containing utility mixins for responsive design. It defines breakpoints for various screen sizes (sm, md, lg, xl, xxl) and provides a `@breakpoint` mixin to apply styles based on minimum or maximum screen widths.

## `src/utils/logger.ts`

**Path:** `src/utils/logger.ts`
**Content Summary:** TypeScript class `Logger` for logging messages to the console. It provides a `log` method that prepends the module name to messages and prevents duplicate consecutive messages, useful for debugging and development.

## `src/utils/tmdb.ts`

**Path:** `src/utils/tmdb.ts`
**Content Summary:** Utility file for interacting with The Movie Database (TMDB) API. It provides functions to construct image URLs from TMDB paths (`getImageUrl`) and to filter out movie/TV show results that do not have a backdrop image (`omitResutlsWithNoBannerImage`).

## `src/utils/url.ts`

**Path:** `src/utils/url.ts`
**Content Summary:** Utility file for generating various URL paths within the application. It provides functions to construct paths for the title page (for banners and general use) and the video playback page, ensuring consistent URL generation.
