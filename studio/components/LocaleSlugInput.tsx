import {Flex, Box, Text, Card} from '@sanity/ui'
import {type SlugInputProps, useFormValue} from 'sanity'

export function LocaleSlugInput(props: SlugInputProps) {
  const locale = useFormValue(['locale']) as string | undefined

  return (
    <Flex align="center" gap={2}>
      {locale && (
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
