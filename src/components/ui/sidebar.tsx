'use client';

import { Slot } from '@radix-ui/react-slot';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'; // Already imported for SheetContent title
import { type VariantProps, cva } from 'class-variance-authority';
import { PanelLeft } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'; // Import SheetTitle
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useHydrated } from '@/hooks/useHydrated';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

const subscribeToCookie = () => () => {};
const getCookieOpen = () => {
  const value = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
    ?.split('=')[1];
  return value === undefined ? undefined : value === 'true';
};

type SidebarContextType = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean | undefined; // Allow undefined during initial render
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextType | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile(); // isMobile can be undefined initially
    const [openMobile, setOpenMobile] = React.useState(false);

    const [_open, _setOpen] = React.useState<boolean>();
    const cookieOpen = React.useSyncExternalStore(
      subscribeToCookie,
      getCookieOpen,
      () => undefined
    );
    const open = openProp ?? _open ?? cookieOpen ?? defaultOpen;

    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === 'function' ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }

        // This sets the cookie to keep the sidebar state.
        if (typeof window !== 'undefined') {
          // biome-ignore lint/suspicious/noDocumentCookie: The preference is read synchronously during initial rendering.
          document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`;
        }
      },
      [setOpenProp, open]
    );

    // Helper to toggle the sidebar.
    const toggleSidebar = React.useCallback(() => {
      // Only toggle if isMobile is determined (not undefined)
      if (isMobile === true) {
        setOpenMobile(currentOpen => !currentOpen);
      } else if (isMobile === false) {
        setOpen(currentOpen => !currentOpen);
      }
    }, [isMobile, setOpen]);

    // Adds a keyboard shortcut to toggle the sidebar.
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Ignore if focus is inside an input, textarea, or select
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }

        if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          toggleSidebar();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSidebar]);

    // We add a state so that we can do data-state="expanded" or "collapsed".
    // This makes it easier to style the sidebar with Tailwind classes.
    const state = open ? 'expanded' : 'collapsed';

    const contextValue = React.useMemo<SidebarContextType>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, toggleSidebar]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                '--sidebar-width': SIDEBAR_WIDTH,
                '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              'group/sidebar-wrapper flex min-h-svh has-data-[variant=inset]:bg-sidebar',
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = 'SidebarProvider';

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    side?: 'left' | 'right';
    variant?: 'sidebar' | 'floating' | 'inset';
    collapsible?: 'offcanvas' | 'icon' | 'none';
  }
>(
  (
    {
      side = 'left',
      variant = 'sidebar',
      collapsible = 'offcanvas',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
    const mounted = useHydrated();

    // Render skeleton or null on the server and during initial client hydration
    if (!mounted) {
      // You could return a basic skeleton structure here if needed
      return null; // Or a simple div placeholder
    }

    if (collapsible === 'none') {
      // Always render expanded for 'none' collapsible type
      return (
        <div
          className={cn(
            'flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border', // Added border
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      );
    }

    // Mobile Rendering (uses Sheet)
    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-sidebar='sidebar'
            data-mobile='true'
            className='w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden'
            style={
              {
                '--sidebar-width': SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            side={side}
          >
            {/* Add a visually hidden title for accessibility inside SheetContent */}
            <VisuallyHidden.Root asChild>
              <SheetTitle>Sidebar Menu</SheetTitle>
            </VisuallyHidden.Root>
            <div className='flex h-full w-full flex-col'>{children}</div>
          </SheetContent>
        </Sheet>
      );
    }

    // Desktop Rendering (happens after mount and if isMobile is false)
    return (
      <div
        ref={ref}
        className='group peer hidden md:block text-sidebar-foreground'
        data-state={state} // 'expanded' or 'collapsed'
        data-collapsible={collapsible} // Pass collapsible prop for styling
        data-variant={variant}
        data-side={side}
      >
        {/* This div creates the space for the sidebar */}
        <div
          className={cn(
            'duration-200 relative h-svh bg-transparent transition-[width] ease-linear',
            // Adjust width based on state and collapsible mode
            'w-0', // Default to 0 width
            'group-data-[state=expanded]:w-(--sidebar-width)', // Expanded width
            // Icon collapsed width - applies only if collapsible is 'icon'
            'group-data-[state=collapsed]:group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
            // Floating/Inset specific width adjustments for icon mode
            (variant === 'floating' || variant === 'inset') &&
              'group-data-[state=collapsed]:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]',
            // Offcanvas collapsed width - applies only if collapsible is 'offcanvas'
            'group-data-[state=collapsed]:group-data-[collapsible=offcanvas]:w-0', // Explicitly 0 for offcanvas collapsed

            // Rotate for right side (doesn't affect width logic)
            'group-data-[side=right]:rotate-180'
          )}
        />
        {/* This div is the actual sidebar content container */}
        <div
          className={cn(
            'duration-200 fixed inset-y-0 z-10 hidden h-svh transition-[left,right,width] ease-linear md:flex',
            // --- Positioning based on side ---
            side === 'left' ? 'left-0' : 'right-0',

            // --- Width based on state and collapsible mode ---
            'w-0', // Default width 0
            'group-data-[state=expanded]:w-(--sidebar-width)', // Expanded width

            // Icon collapsed width
            'group-data-[state=collapsed]:group-data-[collapsible=icon]:w-(--sidebar-width-icon)',

            // Offcanvas collapsed width and positioning
            'group-data-[state=collapsed]:group-data-[collapsible=offcanvas]:w-(--sidebar-width)', // Keep width but move off-screen
            side === 'left'
              ? 'group-data-[state=collapsed]:group-data-[collapsible=offcanvas]:-left-(--sidebar-width)'
              : 'group-data-[state=collapsed]:group-data-[collapsible=offcanvas]:-right-(--sidebar-width)',

            // --- Adjustments for floating/inset variants in icon mode ---
            variant === 'floating' || variant === 'inset'
              ? 'p-2 group-data-[state=collapsed]:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
              : '', // No extra padding for default variant

            // --- Borders based on variant and side ---
            variant === 'sidebar' && side === 'left' && 'border-r border-sidebar-border',
            variant === 'sidebar' && side === 'right' && 'border-l border-sidebar-border',
            (variant === 'floating' || variant === 'inset') && 'p-2', // Padding for these variants

            className
          )}
          {...props}
        >
          <div
            data-sidebar='sidebar'
            className={cn(
              'flex h-full w-full flex-col bg-sidebar',
              // Styling for floating/inset variants
              (variant === 'floating' || variant === 'inset') &&
                'rounded-lg border border-sidebar-border shadow-sm'
            )}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
);
Sidebar.displayName = 'Sidebar';

const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar, isMobile } = useSidebar();
  const mounted = useHydrated();

  // Only render the trigger on the client, and only for mobile view
  if (!mounted || !isMobile) {
    return null;
  }

  return (
    <Button
      ref={ref}
      data-sidebar='trigger'
      variant='ghost'
      size='icon'
      className={cn('h-7 w-7', className)}
      onClick={event => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft />
      <span className='sr-only'>Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = 'SidebarTrigger';

const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(
  ({ className, ...props }, ref) => {
    const { toggleSidebar, isMobile } = useSidebar();
    const mounted = useHydrated();

    // Do not render the rail on mobile or during SSR/hydration
    if (!mounted || isMobile) {
      return null;
    }

    return (
      <button
        ref={ref}
        data-sidebar='rail'
        aria-label='Toggle Sidebar'
        tabIndex={-1}
        onClick={toggleSidebar}
        title='Toggle Sidebar'
        className={cn(
          'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 md:flex', // Changed sm:flex to md:flex
          'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
          '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
          'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar',
          '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
          '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarRail.displayName = 'SidebarRail';

const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<'main'>>(
  ({ className, ...props }, ref) => {
    const { isMobile, state } = useSidebar(); // Use sidebar state
    const mounted = useHydrated();

    return (
      <main
        ref={ref}
        className={cn(
          'relative flex min-h-svh flex-1 flex-col bg-background transition-[padding-left,padding-right] ease-linear', // Add transition for padding
          // --- Mobile ---
          'pl-0', // No padding on mobile by default

          // --- Desktop ---
          // Apply padding based on sidebar state ONLY when mounted and not mobile
          // mounted && !isMobile && state === 'expanded' && "md:pl-(--sidebar-width)", // Expanded padding
          // Apply padding for collapsed icon mode ONLY when mounted, not mobile, and collapsible is icon
          // mounted && !isMobile && state === 'collapsed' && "md:pl-(--sidebar-width-icon)", // Collapsed icon padding

          // --- Inset Variant Specific Adjustments (Apply these ON TOP of the base padding) ---
          'peer-data-[variant=inset]:min-h-[calc(100svh-(--spacing(4)))] md:peer-data-[variant=inset]:m-2',

          // Adjust margin/padding specifically for inset, considering sidebar state and side
          //  mounted && !isMobile && state === 'expanded' && "md:peer-data-[variant=inset]:peer-data-[side=left]:ml-0 md:peer-data-[variant=inset]:peer-data-[side=left]:pl-[calc(var(--sidebar-width)+(--spacing(2)))]",
          //  mounted && !isMobile && state === 'expanded' && "md:peer-data-[variant=inset]:peer-data-[side=right]:mr-0 md:peer-data-[variant=inset]:peer-data-[side=right]:pr-[calc(var(--sidebar-width)+(--spacing(2)))]",

          // Inset + Collapsed Icon mode padding
          //  mounted && !isMobile && state === 'collapsed' && "md:peer-data-[variant=inset]:peer-data-[collapsible=icon]:peer-data-[side=left]:ml-0 md:peer-data-[variant=inset]:peer-data-[collapsible=icon]:peer-data-[side=left]:pl-[calc(var(--sidebar-width-icon)+(--spacing(6)))]",
          //  mounted && !isMobile && state === 'collapsed' && "md:peer-data-[variant=inset]:peer-data-[collapsible=icon]:peer-data-[side=right]:mr-0 md:peer-data-[variant=inset]:peer-data-[collapsible=icon]:peer-data-[side=right]:pr-[calc(var(--sidebar-width-icon)+(--spacing(6)))]",

          // Inset + Offcanvas Collapsed mode (should have no extra padding)
          mounted &&
            !isMobile &&
            state === 'collapsed' &&
            'md:peer-data-[variant=inset]:peer-data-[collapsible=offcanvas]:pl-0 md:peer-data-[variant=inset]:peer-data-[collapsible=offcanvas]:pr-0',

          'md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm',

          className
        )}
        {...props}
      />
    );
  }
);
SidebarInset.displayName = 'SidebarInset';

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar='input'
      className={cn(
        'h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        'group-data-[collapsible=icon]:hidden', // Hide input in icon mode
        className
      )}
      {...props}
    />
  );
});
SidebarInput.displayName = 'SidebarInput';

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar='header'
        className={cn(
          'flex h-14 items-center gap-2 p-2', // Ensure consistent height
          'group-data-[collapsible=icon]:justify-center', // Center content in icon mode header
          className
        )}
        {...props}
      />
    );
  }
);
SidebarHeader.displayName = 'SidebarHeader';

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar='footer'
        className={cn(
          'flex flex-col gap-2 p-2',
          'group-data-[collapsible=icon]:items-center', // Center items in icon mode footer
          className
        )}
        {...props}
      />
    );
  }
);
SidebarFooter.displayName = 'SidebarFooter';

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar='separator'
      className={cn(
        'mx-2 w-auto bg-sidebar-border',
        'group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:my-1 group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:w-5', // Adjust separator for icon mode
        className
      )}
      {...props}
    />
  );
});
SidebarSeparator.displayName = 'SidebarSeparator';

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar='content'
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-2 overflow-auto',
          // Remove overflow hidden for icon mode, adjust padding instead if needed
          // "group-data-[collapsible=icon]:overflow-hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarContent.displayName = 'SidebarContent';

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar='group'
        className={cn(
          'relative flex w-full min-w-0 flex-col p-2',
          'group-data-[collapsible=icon]:p-0', // Remove padding for groups in icon mode
          className
        )}
        {...props}
      />
    );
  }
);
SidebarGroup.displayName = 'SidebarGroup';

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'div';

  return (
    <Comp
      ref={ref}
      data-sidebar='group-label'
      className={cn(
        'duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-hidden ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        // Hide label completely in icon mode
        'group-data-[collapsible=icon]:m-0 group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none',
        className
      )}
      {...props}
    />
  );
});
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      ref={ref}
      data-sidebar='group-action'
      className={cn(
        'absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        // Increases the hit area of the button on mobile.
        'after:absolute after:-inset-2 md:after:hidden',
        // Hide action button in icon mode
        'group-data-[collapsible=icon]:hidden',
        className
      )}
      {...props}
    />
  );
});
SidebarGroupAction.displayName = 'SidebarGroupAction';

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar='group-content'
      className={cn('w-full text-sm', className)}
      {...props}
    />
  )
);
SidebarGroupContent.displayName = 'SidebarGroupContent';

const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      data-sidebar='menu'
      className={cn(
        'flex w-full min-w-0 flex-col gap-1',
        'group-data-[collapsible=icon]:items-center', // Center menu items in icon mode
        className
      )}
      {...props}
    />
  )
);
SidebarMenu.displayName = 'SidebarMenu';

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      data-sidebar='menu-item'
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  )
);
SidebarMenuItem.displayName = 'SidebarMenuItem';

const sidebarMenuButtonVariants = cva(
  [
    'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground',
    // Icon mode adjustments
    'group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0',
    // Span and SVG adjustments for icon mode
    '[&>span:last-child]:group-data-[collapsible=icon]:hidden',
    '[&>svg]:group-data-[collapsible=icon]:size-5',
    // Default [&>svg] styling
    '[&>svg]:size-4 [&>svg]:shrink-0',
    // Default span styling
    '[&>span:last-child]:truncate',
  ],
  {
    variants: {
      variant: {
        default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        outline:
          'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = 'default',
      size = 'default',
      tooltip,
      className,
      children, // Destructure children
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const { isMobile, state } = useSidebar();

    const button = (
      <Comp
        ref={ref}
        data-sidebar='menu-button'
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      >
        {children} {/* Pass original children structure */}
      </Comp>
    );

    // Tooltip logic
    if (!tooltip || state === 'expanded' || isMobile) {
      // Don't show tooltip if expanded or mobile
      return button;
    }

    // Ensure tooltip content is an object
    const tooltipProps = typeof tooltip === 'string' ? { children: tooltip } : tooltip;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side='right'
          align='center'
          //hidden={state !== "collapsed" || isMobile === true} // Hide logic moved outside
          {...tooltipProps} // Spread tooltip content props
        />
      </Tooltip>
    );
  }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    asChild?: boolean;
    showOnHover?: boolean;
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      ref={ref}
      data-sidebar='menu-action'
      className={cn(
        'absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0',
        // Increases the hit area of the button on mobile.
        'after:absolute after:-inset-2 md:after:hidden',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        // Hide action button in icon mode
        'group-data-[collapsible=icon]:hidden',
        showOnHover &&
          'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0',
        className
      )}
      {...props}
    />
  );
});
SidebarMenuAction.displayName = 'SidebarMenuAction';

const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar='menu-badge'
      className={cn(
        'absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none',
        'peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        // Hide badge in icon mode
        'group-data-[collapsible=icon]:hidden',
        className
      )}
      {...props}
    />
  )
);
SidebarMenuBadge.displayName = 'SidebarMenuBadge';

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    showIcon?: boolean;
  }
>(({ className, showIcon = false, ...props }, ref) => {
  const { isMobile, state } = useSidebar(); // Get sidebar state
  const width = '70%';

  return (
    <div
      ref={ref}
      data-sidebar='menu-skeleton'
      className={cn(
        'rounded-md h-8 flex gap-2 px-2 items-center',
        'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0', // Center skeleton in icon mode
        className
      )}
      {...props}
    >
      {(showIcon || // Always show icon if requested
        // Or if in icon mode (collapsed state on desktop)
        (state === 'collapsed' && !isMobile)) && (
        <Skeleton
          className='size-4 rounded-md group-data-[collapsible=icon]:size-5' // Adjust icon size for icon mode
          data-sidebar='menu-skeleton-icon'
        />
      )}
      <Skeleton
        className='h-4 flex-1 max-w-(--skeleton-width) group-data-[collapsible=icon]:hidden' // Hide text skeleton in icon mode
        data-sidebar='menu-skeleton-text'
        style={
          {
            '--skeleton-width': width,
          } as React.CSSProperties
        }
      />
    </div>
  );
});
SidebarMenuSkeleton.displayName = 'SidebarMenuSkeleton';

const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      data-sidebar='menu-sub'
      className={cn(
        'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5',
        // Hide sub-menu in icon mode
        'group-data-[collapsible=icon]:hidden',
        className
      )}
      {...props}
    />
  )
);
SidebarMenuSub.displayName = 'SidebarMenuSub';

const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  ({ ...props }, ref) => <li ref={ref} {...props} />
);
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem';

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<'a'> & {
    asChild?: boolean;
    size?: 'sm' | 'md';
    isActive?: boolean;
  }
>(({ asChild = false, size = 'md', isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      ref={ref}
      data-sidebar='menu-sub-button'
      data-size={size}
      data-active={isActive}
      className={cn(
        'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground',
        'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        // Hide sub-button in icon mode
        'group-data-[collapsible=icon]:hidden',
        className
      )}
      {...props}
    />
  );
});
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton';

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
