'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Grid3X3,
  List,
  Clock,
  Link,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { usePRDFeatures } from '@/hooks/usePRDFeatures';
import { PRIORITY_COLORS } from '@/lib/insights-mapper';
import {
  INSIGHTS_THEME,
  IMPACT_COLORS as THEME_IMPACT_COLORS,
} from '@/components/ui/insightsTheme';
import { Card } from '@/components/ui/card';

interface FeaturesViewAllModalProps {
  projectId: string;
  versionId: string;
  isOpen: boolean;
  onClose: () => void;
}

type SortBy = 'priority' | 'risk';
type FilterPriority = 'all' | 'high' | 'medium' | 'low';
type FilterRisk = 'all' | 'high' | 'medium' | 'low';
type ViewMode = 'table' | 'card';

export function FeaturesViewAllModal({
  projectId,
  versionId,
  isOpen,
  onClose,
}: FeaturesViewAllModalProps) {
  const [sortBy, setSortBy] = useState<SortBy>('priority');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
  const [riskFilter, setRiskFilter] = useState<FilterRisk>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, loading } = usePRDFeatures({
    projectId,
    versionId,
    sort: `${sortBy}:desc` as const,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    risk: riskFilter !== 'all' ? riskFilter : undefined,
    page,
    limit,
  });

  const getEffortPercentage = (effort: string) => {
    switch (effort) {
      case 'low':
        return 25;
      case 'medium':
        return 50;
      case 'high':
        return 75;
      default:
        return 50;
    }
  };

  const FeatureCard = ({ feature }: { feature: any }) => (
    <Card className={INSIGHTS_THEME.card}>
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between">
          <h4 className={INSIGHTS_THEME.subheading}>{feature.name}</h4>
          <div className="flex gap-1">
            <Badge
              variant="outline"
              className={`${INSIGHTS_THEME.chip} ${PRIORITY_COLORS[feature.priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
            >
              {feature.priority}
            </Badge>
            <Badge
              variant="outline"
              className={`${INSIGHTS_THEME.chip} ${PRIORITY_COLORS[feature.risk as keyof typeof PRIORITY_COLORS] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
            >
              {feature.risk}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <div className="flex-1 bg-muted rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{ width: `${getEffortPercentage(feature.effort)}%` }}
            />
          </div>
          <span className={INSIGHTS_THEME.small}>{feature.effort}</span>
        </div>

        {feature.impacts && feature.impacts.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {feature.impacts.map((impact: string, index: number) => (
              <Badge
                key={index}
                variant="outline"
                className={`${INSIGHTS_THEME.chip} ${THEME_IMPACT_COLORS[impact as keyof typeof THEME_IMPACT_COLORS] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
              >
                {impact}
              </Badge>
            ))}
          </div>
        )}

        {feature.dependencies && feature.dependencies.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link className="h-3 w-3" />
            <span>{feature.dependencies.length} dependencies</span>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[85vh] w-full rounded-t-2xl p-0 sm:h-[70vh] sm:max-h-[560px]"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b p-6">
            <SheetTitle>All Features</SheetTitle>
            <SheetDescription>
              {data?.total || 0} features total
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-auto overscroll-contain p-6">
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select
                  value={sortBy}
                  onValueChange={(value: SortBy) => setSortBy(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">Sort by Priority</SelectItem>
                    <SelectItem value="risk">Sort by Risk</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={priorityFilter}
                  onValueChange={(value: FilterPriority) =>
                    setPriorityFilter(value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={riskFilter}
                  onValueChange={(value: FilterRisk) => setRiskFilter(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-1 ml-auto">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setViewMode('table')}
                  >
                    <List className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={viewMode === 'card' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setViewMode('card')}
                  >
                    <Grid3X3 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Features display */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : data && data.items.length > 0 ? (
                <>
                  {viewMode === 'table' ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead>Effort</TableHead>
                          <TableHead>Impacts</TableHead>
                          <TableHead>Dependencies</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.items.map((feature) => (
                          <TableRow key={feature.id}>
                            <TableCell className="font-medium">
                              {feature.name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${PRIORITY_COLORS[feature.priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
                              >
                                {feature.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${PRIORITY_COLORS[feature.risk as keyof typeof PRIORITY_COLORS] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
                              >
                                {feature.risk}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-muted rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{
                                      width: `${getEffortPercentage(feature.effort)}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-xs">
                                  {feature.effort}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {feature.impacts?.map(
                                  (impact: string, index: number) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className={`text-xs ${THEME_IMPACT_COLORS[impact as keyof typeof THEME_IMPACT_COLORS] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
                                    >
                                      {impact}
                                    </Badge>
                                  )
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {feature.dependencies?.length || 0}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.items.map((feature) => (
                        <FeatureCard key={feature.id} feature={feature} />
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {data.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {data.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPage((p) => Math.min(data.totalPages, p + 1))
                          }
                          disabled={page === data.totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No features found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
