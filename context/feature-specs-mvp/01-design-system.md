Read `AGENTS.md` before starting.

We're adding the design system and the UI primitive components.

Install and configure `shadcn/ui`.

Add these shadcn components:
- Button
- Card
- Dialog
- Input
- Tabs
- Text Area
- Scroll Area
- Tooltip
- Toast
- Skeleton
- Spinner
- Table
- Data Table
- Select
- Dropdown Menu
- Sidebar
- Progress
- Attachment
- Avatar
- Badge
- Breadcrumb
- Calendar
- Date Picker
- Checkbox
- Chart
- Context Menu
- Navigation Menu
- Resizable
- Separator

Add the below components as and when needed:
- Accordion
- Alert
- Alert Dialog
- Aspect Ratio
- Bubble
- Button Group
- Carousel
- Collapsible
- Combobox
- Command
- Direction
- Drawer
- Empty
- Field
- Hover Card
- Input Group
- Input OTP
- Item
- Kbd
- Label
- Marker
- Menubar
- Message
- Message Scroller
- Native Select
- Pagination
- Popover
- QuestionnaireNew
- Radio Group
- Sheet
- Slider
- Switch
- Toggle
- Toggle Group
- Typography

Do not modify the generated `components/ui/*` files after installation.

Also install `lucide-react`.

Create `lib/utils.ts` with a reusable `cn()` helper for merging Tailwind classes.

Ensure all the components match the existing theme in `globals.css`.

### Check when done:
- All components import without errors
- `cn()` works properly