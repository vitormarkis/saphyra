export type CommentType = {
  id: string
  postId: number
  authorId: number
  body: string
}

export type PostType = {
  userId: string
  id: number
  title: string
  body: string
}

export type UserType = {
  id: number
  name: string
  username: string
  email: string
  address: Address
  phone: string
  website: string
  company: Company
}

type Address = {
  street: string
  suite: string
  city: string
  zipcode: string
  geo: Geo
}

type Geo = {
  lat: string
  lng: string
}

type Company = {
  name: string
  catchPhrase: string
  bs: string
}
