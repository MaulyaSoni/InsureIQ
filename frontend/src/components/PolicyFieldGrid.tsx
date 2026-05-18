import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PolicyFieldGridProps {
  policy: Record<string, any>;
}

export function PolicyFieldGrid({ policy }: PolicyFieldGridProps) {
  const sections = [
    {
      title: 'Vehicle Information',
      fields: [
        { label: 'Make', value: policy.vehicle_make || '—' },
        { label: 'Model', value: policy.vehicle_model || '—' },
        { label: 'Year', value: policy.vehicle_year || '—' },
        { label: 'Engine CC', value: policy.engine_cc || '—' },
        { label: 'Fuel Type', value: policy.fuel_type || '—' },
      ],
    },
    {
      title: 'Registration',
      fields: [
        { label: 'City', value: policy.city || 'Mumbai' },
        { label: 'RTO Code', value: policy.rto_code || 'MH-01' },
      ],
    },
    {
      title: 'Policy & Commercials',
      fields: [
        { label: 'Usage Type', value: policy.usage_type || 'Personal', highlight: policy.usage_type === 'Commercial' },
        { label: 'Annual Mileage', value: `${policy.annual_mileage?.toLocaleString() || '12,000'} KM` },
        { label: 'IDV (Insured Value)', value: `₹${policy.idv_value?.toLocaleString() || '0'}` },
        { label: 'Current Premium', value: `₹${policy.premium_amount?.toLocaleString() || '0'}`, brand: true },
      ],
    },
    {
      title: 'History & Safety',
      fields: [
        { label: 'Prior Claims', value: policy.prior_claims ?? 0, danger: (policy.prior_claims || 0) > 0 },
        { label: 'NCB %', value: `${policy.ncb_percent || '0'}%`, success: true },
        { label: 'Anti-Theft Device', value: policy.anti_theft_device ? 'Yes' : 'No' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-4">
          <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            {section.title}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {section.fields.map((field) => (
              <div key={field.label}>
                <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  {field.label}
                </div>
                <div
                  className="font-mono-code text-sm"
                  style={{
                    color: field.highlight
                      ? '#D97706'
                      : field.brand
                      ? 'var(--text-brand)'
                      : field.danger
                      ? '#DC2626'
                      : field.success
                      ? '#16A34A'
                      : 'var(--text-primary)',
                  }}
                >
                  {field.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
