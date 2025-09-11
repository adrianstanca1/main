# AS Agents - Construction Management Application

AS Agents is a modern React/TypeScript construction management web application built with Vite. It provides multitenant project management, timesheet tracking, safety management, and team collaboration tools for construction companies with role-based access control.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Prerequisites and Environment Setup
- **Node.js**: Install Node.js (the application works with Node.js 18+)
- **GEMINI_API_KEY**: Create `.env.local` file with `GEMINI_API_KEY=your_api_key_here` for AI features to work properly

### Bootstrap, Build, and Test the Repository
1. **Install dependencies**: `npm install` -- takes 3-12 seconds (varies by cache state)
2. **Build the application**: `npm run build` -- takes ~3 seconds. NEVER CANCEL. Always wait for completion.
3. **Run development server**: `npm run dev` -- starts in ~200ms at http://localhost:5173/
4. **Run production preview**: `npm run preview` -- starts instantly at http://localhost:4173/

### Available Commands
- `npm install` -- Install all dependencies (3-12 seconds depending on cache)
- `npm run dev` -- Start development server with hot reload
- `npm run build` -- Build for production (3 seconds) 
- `npm run preview` -- Preview production build locally

### No Linting or Testing Setup
- **No linting tools**: This repository does not have ESLint, Prettier, or other linting tools configured
- **No test framework**: This repository does not have Jest, Vitest, or other testing frameworks set up
- **No CI/CD**: This repository does not have GitHub Actions or other CI/CD pipelines

## Validation

### Manual Testing Requirements
**ALWAYS manually validate any code changes by running the application and testing user scenarios:**

1. **Start the application**: `npm run dev`
2. **Test login flow**: 
   - Navigate to http://localhost:5173/
   - Select any user profile (e.g., "Michael Rodriguez Company Admin")
   - Verify dashboard loads with projects, recent activity, and navigation sidebar
3. **Test core navigation**:
   - Click "Projects" - verify project list loads with search/filter functionality
   - Click "Map View" - verify map component loads (may show empty tiles due to network restrictions)
   - Click "Dashboard" - verify return to main dashboard
4. **Test environment dependency**:
   - Application requires `.env.local` with `GEMINI_API_KEY` to function properly
   - Create test file: `echo "GEMINI_API_KEY=test_key" > .env.local`

### Build Validation
- Always run `npm run build` after making changes to ensure production build succeeds
- Check for TypeScript compilation errors and resolve them before completing work
- Verify no critical warnings in build output

## Technical Architecture

### Technology Stack
- **Frontend**: React 18.2.0 with TypeScript
- **Build Tool**: Vite 6.x for fast development and building  
- **Styling**: Tailwind CSS (loaded via CDN)
- **Maps**: Leaflet with React-Leaflet for project location mapping
- **AI Integration**: Google Gemini API for AI-powered features
- **State Management**: React hooks and context (no external state library)

### Key Files and Directories
- **App.tsx**: Main application component with routing and state management
- **components/**: All React components organized by feature
  - `layout/`: Header, Sidebar, and layout components
  - `ui/`: Reusable UI components
  - Feature-specific components (Dashboard, Projects, Safety, etc.)
- **services/**: API services and authentication
  - `mockApi.ts`: Mock data and API simulation
  - `auth.ts`: Authentication and permissions logic
- **hooks/**: Custom React hooks for shared functionality
- **types.ts**: TypeScript type definitions for the entire application
- **index.html**: Main HTML template with CDN imports
- **vite.config.ts**: Vite build configuration

### Project Structure Patterns
- **Feature-based organization**: Components grouped by application features
- **Type safety**: Comprehensive TypeScript definitions in types.ts
- **Role-based access**: Permission system defined in types.ts and implemented in auth.ts
- **Mock data**: Full mock backend in services/mockData.ts for development

## Common Development Tasks

### Adding New Features
1. Define new types in `types.ts` if needed
2. Create components in appropriate `components/` subdirectory
3. Add API endpoints to `services/mockApi.ts`
4. Update routing and navigation in `App.tsx`
5. Test manually using the validation process above

### Working with Permissions
- Check `types.ts` for available `Permission` enums
- Use `hasPermission()` from `services/auth.ts` to guard features
- Test with different user roles by logging in as different profiles

### Styling Guidelines
- Use Tailwind CSS classes for styling
- Dark mode support is built-in with custom CSS variables
- Refer to `index.html` for color scheme and dark mode implementation

## External Dependencies and Limitations

### CDN Dependencies
The application loads several dependencies via CDN which may be blocked in restricted environments:
- Tailwind CSS: https://cdn.tailwindcss.com/ 
- Google Fonts: https://fonts.googleapis.com/
- Leaflet CSS: https://unpkg.com/leaflet@1.9.4/dist/leaflet.css

### Image Dependencies
- Project images: Pexels.com (may be blocked)
- Map tiles: OpenStreetMap tile servers (may be blocked)

### Network Restrictions
When working in environments with network restrictions:
- Application will still function but styling may be minimal
- Maps will not display tiles but components will still work
- User interface may appear unstyled but functionality remains intact

## Quick Reference

### Repository Root Contents
```
├── .github/
├── components/          # React components
├── hooks/              # Custom React hooks  
├── services/           # API and auth services
├── App.tsx            # Main application component
├── index.html         # HTML template with CDN imports
├── index.tsx          # React application entry point
├── metadata.json      # Application metadata
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── types.ts           # TypeScript type definitions
├── vite.config.ts     # Vite build configuration
└── .env.local         # Environment variables (create manually)
```

### Available Scripts Summary
```bash
npm install     # Install dependencies (3-12s depending on cache)
npm run dev     # Development server (200ms)
npm run build   # Production build (3s)
npm run preview # Preview production build
```

### User Profiles for Testing
- **Platform Admin**: "PA Platform Admin" - Principal Admin role
- **Company Admins**: "Michael Rodriguez", "Laura Smith" - Company management
- **Project Managers**: "Sarah Johnson", "Ben Carter" - Project oversight
- **Safety Officers**: "Emily White" - Safety management
- **Operatives**: "David Chen", "James Wilson", "Maria Garcia", "Olivia Green" - Field workers
- **Foremen**: "Robert Brown" - Site supervision