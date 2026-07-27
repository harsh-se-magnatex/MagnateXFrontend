"use client"

import type { CSSProperties } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { ERROR_TOASTER_ID } from "@/lib/show-error-toast"

const toasterStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
} as CSSProperties

const Toaster = ({ position = "bottom-right", className, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const themeProp = theme as ToasterProps["theme"]

  const shared = {
    ...props,
    theme: themeProp,
    icons: {
      success: <CircleCheckIcon className="size-4" />,
      info: <InfoIcon className="size-4" />,
      warning: <TriangleAlertIcon className="size-4" />,
      error: <OctagonXIcon className="size-4" />,
      loading: <Loader2Icon className="size-4 animate-spin" />,
    },
    style: { ...toasterStyle, ...props.style },
    toastOptions: {
      ...props.toastOptions,
      classNames: {
        ...props.toastOptions?.classNames,
        toast: ["cn-toast", props.toastOptions?.classNames?.toast].filter(Boolean).join(" "),
      },
    },
  }

  return (
    <>
      <Sonner
        {...shared}
        position={position}
        className={["toaster group", className].filter(Boolean).join(" ")}
      />
      <Sonner
        {...shared}
        id={ERROR_TOASTER_ID}
        position="top-center"
        className="toaster group sonner-error-center"
        closeButton={false}
        richColors={false}
        hotkey={[]}
        expand={false}
        gap={8}
        visibleToasts={5}
      />
    </>
  )
}

export { Toaster }
