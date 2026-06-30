terraform {
  cloud {
    organization = "tailorweddings"

    workspaces {
      name = "tailorweddings-staging"
    }
  }
}
