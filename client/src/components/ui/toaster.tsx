import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useTranslation } from "react-i18next"

export function Toaster() {
  const { toasts } = useToast()
  const { t } = useTranslation()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        // 번역 키가 있는 경우 번역 처리
        const translatedTitle = typeof title === 'string' && title.startsWith('notifications.') 
          ? t(title) 
          : title;
          
        const translatedDescription = typeof description === 'string' && description.startsWith('notifications.') 
          ? t(description) 
          : description;

        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {translatedTitle && <ToastTitle>{translatedTitle}</ToastTitle>}
              {translatedDescription && (
                <ToastDescription>{translatedDescription}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
