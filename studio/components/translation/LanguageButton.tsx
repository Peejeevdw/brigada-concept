import {Badge, Box, Button, Flex, Spinner, Text, Tooltip} from '@sanity/ui'
import {AddIcon, CheckmarkIcon, SplitVerticalIcon} from '@sanity/icons'
import type {Language} from '@sanity/document-internationalization'

interface LanguageButtonProps {
  language: Language
  isCurrent: boolean
  existingRef: string | undefined
  isCreating: boolean
  disabled: boolean
  onOpen: (ref: string) => void
  onCreate: (language: Language) => void
}

export function LanguageButton({
  language,
  isCurrent,
  existingRef,
  isCreating,
  disabled,
  onOpen,
  onCreate,
}: LanguageButtonProps) {
  const message = isCurrent
    ? 'Current language version'
    : existingRef
      ? `Open ${language.title} version`
      : `Create ${language.title} version`

  const icon = isCurrent ? <CheckmarkIcon /> : existingRef ? <SplitVerticalIcon /> : <AddIcon />

  return (
    <Tooltip
      animate
      content={
        <Box padding={2}>
          <Text muted size={1}>
            {message}
          </Text>
        </Box>
      }
      placement="top"
      portal
    >
      <Button
        onClick={() => {
          if (isCurrent) return
          if (existingRef) onOpen(existingRef)
          else onCreate(language)
        }}
        mode={isCurrent ? 'default' : 'bleed'}
        disabled={isCurrent || isCreating || disabled}
      >
        <Flex gap={3} align="center">
          {isCreating ? <Spinner /> : <Text size={2}>{icon}</Text>}
          <Box flex={1}>
            <Text>{language.title}</Text>
          </Box>
          <Badge tone={isCurrent ? 'default' : 'primary'}>{language.id}</Badge>
        </Flex>
      </Button>
    </Tooltip>
  )
}
