"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

function DropdownMenu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({
  className,
  ...props
}: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      className={cn("outline-none", className)}
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "sideOffset" | "align">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner sideOffset={sideOffset} align={align}>
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 min-w-[10rem] origin-[var(--transform-origin)] overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  inset,
  checked,
  ...props
}: MenuPrimitive.Item.Props & { inset?: boolean; checked?: boolean }) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors",
        "data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {props.children}
      {checked && <Check className="ml-auto size-3.5" aria-hidden="true" />}
    </MenuPrimitive.Item>
  )
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem }
