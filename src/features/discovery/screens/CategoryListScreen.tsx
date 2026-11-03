// Port of 2_client_dashboard/presentation/screens/category_list_screen.dart
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { PageHeader, Screen } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { ALL_CATEGORIES } from '@/lib/models'
import { CategoryGrid } from '../components/DashboardWidgets'

export default function CategoryListScreen() {
  const t = useT()
  const navigate = useNavigate()
  return (
    <Screen className="max-w-5xl">
      <PageHeader
        title={t('client.dashboard.categories_title')}
        onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate(Routes.clientHome, { replace: true }))}
      />
      <div className="px-5 pt-[18px]">
        <CategoryGrid categories={ALL_CATEGORIES} showAll onSelect={(id) => navigate(Routes.clientDiscover, { state: { categoryId: id } })} />
      </div>
    </Screen>
  )
}
