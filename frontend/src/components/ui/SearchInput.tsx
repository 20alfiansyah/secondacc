import * as React from 'react'
import { cn } from '@/lib/utils'
import Icon from '@/components/ui/Icon'

/**
 * Shared compact search field (~40px) used across POS sections so every
 * search bar looks identical: same height, same border/ring, same clear
 * button, same optional keyboard hint badge. Pass a max-width class
 * (e.g. `w-full max-w-[300px]`) — it does not stretch by itself.
 */
const SearchInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    /** Controlled value (shown to decide clear-vs-hint). */
    value: string
    /** Keyboard hint badge (e.g. "/") shown when empty and unfocused. */
    hint?: string
  }
>(({ value, hint, className, ...props }, ref) => {
  const [focused, setFocused] = React.useState(false)

  return (
    <div className={cn('relative', className)}>
      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-slate-400" />
      <input
        type="text"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="h-10 w-full rounded-xl border border-border/80 bg-card pl-9 pr-10 text-sm shadow-subtle transition-all duration-150 placeholder:text-muted-foreground/60 focus-visible:border-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        {...props}
        ref={ref}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            const setter = (props as { onChange?: React.ChangeEventHandler<HTMLInputElement> }).onChange
            if (setter) {
              setter({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
            }
          }}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Icon name="close" className="text-[14px]" />
        </button>
      ) : (
        hint &&
        !focused && (
          <kbd className="absolute right-2.5 top-1/2 flex h-5 -translate-y-1/2 items-center rounded-md border border-border/70 bg-background px-1.5 text-[10px] font-semibold text-muted-foreground/70">
            {hint}
          </kbd>
        )
      )}
    </div>
  )
})
SearchInput.displayName = 'SearchInput'

export { SearchInput }
