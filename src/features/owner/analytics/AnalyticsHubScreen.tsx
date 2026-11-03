// Port of 3_owner_analytics/presentation/screens/analytics_hub_screen.dart (+ AnalyticsBloc)
import { BarChart3, ChevronLeft, PieChart, RefreshCw, Star, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useAuth } from '@/auth/AuthContext'
import { Card, ErrorState, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { getSalonForOwner } from '@/lib/firestore'
import { formatCurrency } from '@/lib/format'
import { useAsync } from '@/lib/hooks'
import { useT } from '@/lib/i18n'
import { loadAnalytics } from '../api'
import { HeaderIconButton, OwnerTabHeader } from '../components/OwnerChrome'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COLORS = ['#6C5CE7', '#FAB1A0', '#00B894', '#FDCB6E', '#FF6B6B']

export default function AnalyticsHubScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { status, user } = useAuth()
  const uid = status === 'authenticated' ? user?.uid : undefined

  const { data, error, loading, reload } = useAsync(async () => {
    if (!uid) throw new Error('You are not signed in')
    const salon = await getSalonForOwner(uid)
    if (!salon) throw new Error('No salon found for your account')
    return await loadAnalytics(salon)
  }, [uid])

  const canGoBack = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0

  let body
  if (loading && !data) {
    body = (
      <div className="grid gap-8 p-5 lg:grid-cols-2" aria-busy="true" aria-label="Loading analytics">
        {[0, 1].map((i) => (
          <section key={i}>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-2 h-[250px] !rounded-[22px]" />
          </section>
        ))}
        <section className="lg:col-span-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-[200px] !rounded-[22px]" />
        </section>
      </div>
    )
  } else if (error || !data) {
    const f = friendlyError(error)
    body = (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorState title="Couldn't load analytics" message={f.message} hint={f.hint} onRetry={() => void reload()} retrying={loading} />
      </div>
    )
  } else {
    const maxRevenue = Math.max(...data.weeklyRevenue)
    const total = [...data.servicePopularity.values()].reduce((s, c) => s + c, 0)
    const sorted = [...data.servicePopularity.entries()].sort((a, b) => b[1] - a[1])
    const chartData = data.weeklyRevenue.map((v, i) => ({ day: DAYS[i], revenue: v }))

    body = (
      <div className="grid gap-8 p-5 lg:grid-cols-2">
        <section>
          <SectionTitle icon={BarChart3} title="Weekly Revenue" />
          <Card className="mt-2 h-[250px]">
            {data.weeklyRevenue.length === 0 ? (
              <Centered>No revenue data yet</Centered>
            ) : maxRevenue === 0 ? (
              <Centered>No revenue data to display</Centered>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#636E72' }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(108,92,231,0.08)' }}
                    formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)' }}
                  />
                  <Bar dataKey="revenue" fill="#6C5CE7" radius={[6, 6, 0, 0]} maxBarSize={18} minPointSize={5} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle icon={PieChart} title="Service Popularity" />
          <Card className="mt-2 h-[250px] overflow-y-auto">
            {total === 0 ? (
              <Centered>No data yet</Centered>
            ) : (
              <div className="space-y-4 p-1">
                {sorted.map(([name, count], i) => {
                  const pct = count / total
                  return (
                    <div key={name}>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate font-bold text-ink">{name}</span>
                        <span className="shrink-0 text-muted">{`${(pct * 100).toFixed(0)}% (${count})`}</span>
                      </div>
                      <div className="mt-1 h-3 overflow-hidden rounded-lg bg-line/50">
                        <div className="h-full rounded-lg" style={{ width: `${pct * 100}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </section>

        <section className="lg:col-span-2">
          <SectionTitle icon={Star} title="Top Services" />
          <Card className="mt-2">
            {data.topServices.length === 0 ? (
              <p className="p-1 text-sm text-muted">{t('owner.analytics.no_services')}</p>
            ) : (
              <ul className="divide-y divide-line/50">
                {data.topServices.map(([name, count], i) => (
                  <li key={name} className="flex items-center gap-4 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm text-primary">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{name}</span>
                    <span className="text-xs text-ink/70">{`${count} ${t('owner.analytics.bookings_count')}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    )
  }

  return (
    <div className="pb-28 md:pb-12">
      <OwnerTabHeader
        title={t('owner.analytics.title')}
        leading={canGoBack ? <HeaderIconButton icon={ChevronLeft} variant="plain" label="Back" onClick={() => navigate(-1)} /> : undefined}
        actions={<HeaderIconButton icon={RefreshCw} variant="plain" label="Refresh" spin={loading && !!data} onClick={() => void reload()} />}
      />
      <div className={`mx-auto w-full max-w-5xl transition-opacity ${loading && data ? 'opacity-60' : ''}`}>{body}</div>
    </div>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-4">
      <Icon className="text-primary" />
      <h2 className="text-xl font-bold text-ink">{title}</h2>
    </div>
  )
}

function Centered({ children }: { children: string }) {
  return <div className="grid h-full place-items-center text-sm text-ink/50">{children}</div>
}
