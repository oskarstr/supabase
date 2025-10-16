import { UseFormReturn } from 'react-hook-form'

import Panel from 'components/ui/Panel'
import { FormField_Shadcn_, Checkbox_Shadcn_ } from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'

import type { ProjectCreateVariables } from 'data/projects/project-create-mutation'

export type LocalRuntimeServiceOption = {
  id: string
  label: string
  description?: string
  defaultEnabled?: boolean
}

export type LocalRuntimeServicesConfig = {
  options: LocalRuntimeServiceOption[]
  optionIds: string[]
  defaultSelection: string[]
}

export const FALLBACK_LOCAL_RUNTIME_SERVICES: LocalRuntimeServiceOption[] = [
  {
    id: 'studio',
    label: 'Supabase Studio',
    description: 'Local dashboard for managing your project (http://localhost:3000).',
    defaultEnabled: true,
  },
  {
    id: 'mailpit',
    label: 'Mailpit',
    description: 'SMTP capture inbox for testing email flows locally.',
    defaultEnabled: true,
  },
  {
    id: 'logflare',
    label: 'Logflare',
    description: 'Analytics UI used by Studio for log drains and log exploration.',
  },
  {
    id: 'vector',
    label: 'Vector',
    description: 'Log forwarder that ships logs into Logflare and other destinations.',
  },
]

export const createLocalRuntimeServicesConfig = ({
  isPlatform,
  services,
}: {
  isPlatform: boolean
  services?: LocalRuntimeServiceOption[] | null
}): LocalRuntimeServicesConfig => {
  if (!isPlatform) {
    return { options: [], optionIds: [], defaultSelection: [] }
  }

  const options = services && services.length > 0 ? services : FALLBACK_LOCAL_RUNTIME_SERVICES
  const optionIds = options.map((service) => service.id)
  const defaultSelection = options
    .filter((service) => service.defaultEnabled !== false)
    .map((service) => service.id)

  return { options, optionIds, defaultSelection }
}

export const applyLocalRuntimeServicesToPayload = ({
  payload,
  selectedServices,
  config,
}: {
  payload: ProjectCreateVariables
  selectedServices?: string[]
  config: LocalRuntimeServicesConfig
}) => {
  if (config.optionIds.length === 0) return

  const activeSelection = selectedServices && selectedServices.length > 0
    ? selectedServices
    : config.defaultSelection

  const excludedServices = config.optionIds.filter(
    (serviceId) => !activeSelection.includes(serviceId)
  )

  if (excludedServices.length > 0) {
    payload.localRuntimeExclude = excludedServices
  }
}

export const LocalRuntimeServicesField = <TFieldValues extends { localServices?: string[] }>({
  form,
  config,
}: {
  form: UseFormReturn<TFieldValues>
  config: LocalRuntimeServicesConfig
}) => {
  if (config.options.length === 0) return null

  return (
    <Panel.Content>
      <FormField_Shadcn_
        control={form.control as any}
        name={'localServices' as any}
        render={({ field }) => {
          const value: string[] = field.value ?? config.defaultSelection

          return (
            <FormItemLayout
              label="Local runtime services"
              layout="vertical"
              description="Choose which services should start when provisioning locally."
            >
              <div className="space-y-3">
                {config.options.map((service) => {
                  const checked = value.includes(service.id)
                  return (
                    <label key={service.id} className="flex items-start gap-3">
                      <Checkbox_Shadcn_
                        checked={checked}
                        onCheckedChange={(next) => {
                          const current = new Set(value)
                          if (next) current.add(service.id)
                          else current.delete(service.id)
                          field.onChange(Array.from(current))
                        }}
                      />
                      <span>
                        <p className="font-medium text-sm">{service.label}</p>
                        {service.description && (
                          <p className="text-foreground-lighter text-sm leading-snug">
                            {service.description}
                          </p>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </FormItemLayout>
          )
        }}
      />
    </Panel.Content>
  )
}

