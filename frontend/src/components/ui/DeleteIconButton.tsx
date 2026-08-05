interface Props {
  onClick: () => void
  title?: string
  className?: string
}

export default function DeleteIconButton({
  onClick,
  title = 'Xóa',
  className = '',
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`hidden h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm text-gray-600 hover:bg-red-500 hover:text-white group-hover:flex ${className}`}
    >
      ×
    </button>
  )
}
