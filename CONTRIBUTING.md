# Contributing to TK Time Keeping System

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/tk.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup instructions.

Quick start:
```bash
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

## Code Standards

### TypeScript
- Always use TypeScript, not JavaScript
- Define proper types for all props and state
- Use type-only imports where appropriate: `import type { Type } from 'module'`
- Avoid `any` types unless absolutely necessary

### React
- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper dependency arrays in useEffect

### Styling
- Use CSS files colocated with components
- Follow BEM naming convention for CSS classes
- Ensure responsive design (mobile-first)
- Test on different screen sizes

### Code Quality
- Run `npm run lint` before committing
- Fix all linting errors
- Run `npm run build` to ensure TypeScript compilation works
- Write clear, self-documenting code
- Add comments for complex logic only

## Project Structure

```
tk/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React contexts (Auth, etc.)
│   ├── lib/            # Third-party library configs
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── supabase-setup.sql  # Database schema
└── [config files]      # Various config files
```

## Making Changes

### Adding a New Feature

1. **Plan**: Outline the feature and its requirements
2. **Design**: Consider the UI/UX implications
3. **Implement**: Write the code following our standards
4. **Test**: Manually test all user flows
5. **Document**: Update relevant documentation
6. **Review**: Submit a PR with clear description

### Fixing a Bug

1. **Reproduce**: Ensure you can reproduce the bug
2. **Identify**: Find the root cause
3. **Fix**: Implement the smallest possible fix
4. **Test**: Verify the fix works and doesn't break anything
5. **Document**: Add comments if the fix isn't obvious

### Improving Documentation

- Keep documentation up-to-date with code changes
- Use clear, concise language
- Include code examples where helpful
- Test all instructions to ensure they work

## Testing

Currently, this project doesn't have automated tests. Manual testing is required:

1. **Authentication Flow**
   - Sign up with new account
   - Sign in with existing account
   - Sign out

2. **Time Tracking**
   - Start a timer
   - Verify timer updates every second
   - Stop the timer
   - Verify entry appears in list

3. **Entry Management**
   - Create multiple entries
   - Delete an entry
   - Verify data persists after page reload

4. **Responsive Design**
   - Test on desktop (1920x1080, 1366x768)
   - Test on tablet (iPad, 768x1024)
   - Test on mobile (iPhone, Android, 375x667)

5. **Error Handling**
   - Test with invalid credentials
   - Test with network errors
   - Test with missing environment variables

## Commit Messages

Use clear, descriptive commit messages:

```
Good:
- Add delete confirmation dialog
- Fix timer not updating after stop
- Update README with deployment instructions

Bad:
- Update stuff
- Fix bug
- Changes
```

Format: `<verb> <what changed>`

Examples:
- `Add user profile page`
- `Fix timer reset bug`
- `Update dependencies`
- `Refactor auth context`
- `Remove unused imports`

## Pull Requests

### Before Submitting

- [ ] Code follows the style guidelines
- [ ] All linting errors are fixed (`npm run lint`)
- [ ] Code builds successfully (`npm run build`)
- [ ] Changes have been manually tested
- [ ] Documentation is updated
- [ ] Commit messages are clear

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Testing
How did you test these changes?

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code builds without errors
- [ ] All linting passes
- [ ] Manually tested all changes
- [ ] Documentation updated
```

## Code Review Process

1. A maintainer will review your PR
2. Address any feedback or questions
3. Once approved, a maintainer will merge your PR
4. Your contribution will be included in the next release

## Questions?

- Check existing documentation first
- Open an issue for discussion
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉
