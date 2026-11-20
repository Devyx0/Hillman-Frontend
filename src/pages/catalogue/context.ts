import { createContext, useContext } from 'react'

/** True when the current user may edit the catalogue (`catalogue.edit`). */
export const CatalogueEditContext = createContext(false)
export const useCanEditCatalogue = () => useContext(CatalogueEditContext)
