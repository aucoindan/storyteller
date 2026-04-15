declare module "epubchecker" {
  export default function epubchecker(
    path: string,
  ): Promise<{ messages: Message[] }>

  export interface Message {
    ID: string
    severity: "ERROR" | "WARNING" | "INFO" | "FATAL"
    message: string
    additionalLocations: 0
    locations: Location[]
  }

  export interface Location {
    url: { hierachical: boolean; opaque: boolean }
    path: string
    line: number
    column: number
    context: string
  }
}
