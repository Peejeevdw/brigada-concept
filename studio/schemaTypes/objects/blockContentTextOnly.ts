import {defineArrayMember, defineType} from 'sanity'

export const blockContentTextOnly = defineType({
  title: 'Block Content (Text Only)',
  name: 'blockContentTextOnly',
  type: 'array',
  of: [defineArrayMember({type: 'block'})],
})
