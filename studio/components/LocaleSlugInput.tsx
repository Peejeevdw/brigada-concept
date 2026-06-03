import {Flex, Box, Text, Card} from '@sanity/ui'
import {type SlugInputProps, useFormValue} from 'sanity'
import {STATIC_LOCALES} from '../structure/constants'

export function LocaleSlugInput(props: SlugInputProps) {
  const locale = useFormValue(['locale']) as string | undefined
  // Single-locale mode: drop the "/en" badge since there's nothing to
  // distinguish. The locale stays on the document for forward-compat with
  // multi-locale, but the editor UI shouldn't surface it.
  const isMultiLocale = STATIC_LOCALES.length > 1

  return (
    <Flex align="center" gap={2}>
      {locale && isMultiLocale && (
        <Card padding={3} radius={2} tone="transparent" border>
          <Text size={1} weight="medium" muted>
            /{locale}
          </Text>
        </Card>
      )}
      <Box flex={1}>{props.renderDefault(props)}</Box>
    </Flex>
  )
}
