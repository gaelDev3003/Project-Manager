'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  Filter,
  Grid3X3,
  List,
  AlertTriangle,
  Target,
  Clock,
  Link,
} from 'lucide-react';
import {
  InsightViewModel,
  PRIORITY_COLORS,
  IMPACT_COLORS,
} from '@/lib/insights-mapper';
import {
  INSIGHTS_THEME,
  IMPACT_COLORS as THEME_IMPACT_COLORS,
} from '@/components/ui/insightsTheme';
import { cn } from '@/lib/utils';

interface InsightsFeaturesProps {
  data: InsightViewModel;
  isMobile?: boolean;
}

type SortBy = 'priority' | 'risk';
type FilterPriority = 'all' | 'high' | 'medium' | 'low';
type FilterRisk = 'all' | 'high' | 'medium' | 'low';
type FilterTags = string[];
type ViewMode = 'table' | 'card';

interface FeatureFilters {
  sortBy: SortBy;
  priority: FilterPriority;
  risk: FilterRisk;
  tags: FilterTags;
  viewMode: ViewMode;
  showAll: boolean;
}

export function InsightsFeatures({
  data,
  isMobile = false,
}: InsightsFeaturesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FeatureFilters>({
    sortBy: 'priority',
    priority: 'all',
    risk: 'all',
    tags: [],
    viewMode: isMobile ? 'card' : 'table',
    showAll: false,
  });

  // URL state management
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const features = urlParams.get('features');
    const fPriority = urlParams.get('f_priority') as FilterPriority;
    const fRisk = urlParams.get('f_risk') as FilterRisk;
    const fTags = urlParams.get('f_tags');
    const fView = urlParams.get('f_view') as ViewMode;

    setFilters((prev) => ({
      ...prev,
      showAll: features === 'all',
      priority: fPriority || 'all',
      risk: fRisk || 'all',
      tags: fTags ? fTags.split(',') : [],
      viewMode: fView || (isMobile ? 'card' : 'table'),
    }));
  }, [isMobile]);

  // Update URL when filters change
  const updateURL = (newFilters: Partial<FeatureFilters>) => {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (newFilters.showAll !== undefined) {
      params.set('features', newFilters.showAll ? 'all' : 'top');
    }
    if (newFilters.priority !== undefined) {
      params.set('f_priority', newFilters.priority);
    }
    if (newFilters.risk !== undefined) {
      params.set('f_risk', newFilters.risk);
    }
    if (newFilters.tags !== undefined) {
      params.set('f_tags', newFilters.tags.join(','));
    }
    if (newFilters.viewMode !== undefined) {
      params.set('f_view', newFilters.viewMode);
    }

    window.history.replaceState({}, '', url.toString());
  };

  const handleFilterChange = (key: keyof FeatureFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const features = data.features;
  const top3Features = features.slice(0, 3);
  const displayFeatures = filters.showAll ? features : top3Features;

  // Filter and sort features
  const filteredAndSortedFeatures = useMemo(() => {
    let filtered = features;

    // Apply filters
    if (filters.priority !== 'all') {
      filtered = filtered.filter((f) => f.priority === filters.priority);
    }
    if (filters.risk !== 'all') {
      filtered = filtered.filter((f) => f.risk === filters.risk);
    }
    if (filters.tags.length > 0) {
      filtered = filtered.filter((f) =>
        f.impacts.some((impact) => filters.tags.includes(impact))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (filters.sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        if (aPriority !== bPriority) return bPriority - aPriority;

        // Secondary sort by risk
        const riskOrder = { high: 3, medium: 2, low: 1 };
        return riskOrder[b.risk] - riskOrder[a.risk];
      } else {
        const riskOrder = { high: 3, medium: 2, low: 1 };
        const aRisk = riskOrder[a.risk];
        const bRisk = riskOrder[b.risk];
        if (aRisk !== bRisk) return bRisk - aRisk;

        // Secondary sort by priority
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
    });

    return filtered;
  }, [features, filters]);

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

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    features.forEach((f) => f.impacts.forEach((impact) => tags.add(impact)));
    return Array.from(tags);
  }, [features]);

  const FeatureCard = ({ feature }: { feature: (typeof features)[0] }) => (
    <Card className={INSIGHTS_THEME.card}>
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 className={INSIGHTS_THEME.subheading}>{feature.name}</h4>
          <div className="flex gap-1">
            <Badge
              variant="outline"
              className={`${INSIGHTS_THEME.chip} ${PRIORITY_COLORS[feature.priority]}`}
            >
              {feature.priority}
            </Badge>
            <Badge
              variant="outline"
              className={`${INSIGHTS_THEME.chip} ${PRIORITY_COLORS[feature.risk]}`}
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

        <div className="flex flex-wrap gap-1">
          {feature.impacts.map((impact, index) => (
            <Badge
              key={index}
              variant="outline"
              className={`${INSIGHTS_THEME.chip} ${THEME_IMPACT_COLORS[impact as keyof typeof THEME_IMPACT_COLORS] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
            >
              {impact}
            </Badge>
          ))}
        </div>

        {feature.dependencies.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link className="h-3 w-3" />
            <span>{feature.dependencies.length} dependencies</span>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div data-testid="insights-features">
      <Card className={INSIGHTS_THEME.card}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-accent/50 -m-4 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={
                      INSIGHTS_THEME.iconSizeSmall + ' text-muted-foreground'
                    }
                  />
                  <CardTitle className={INSIGHTS_THEME.subheading}>
                    Features
                  </CardTitle>
                  <Badge variant="secondary" className={INSIGHTS_THEME.chip}>
                    {features.length} total
                  </Badge>
                </div>
                <ChevronDown
                  className={cn(
                    INSIGHTS_THEME.iconSizeSmall +
                      ' ' +
                      INSIGHTS_THEME.transition,
                    isExpanded && 'rotate-180'
                  )}
                />
              </div>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Summary counts */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-semibold text-red-500">
                      {features.filter((f) => f.priority === 'high').length}
                    </div>
                    <div className={INSIGHTS_THEME.small}>High Priority</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-amber-500">
                      {features.filter((f) => f.risk === 'high').length}
                    </div>
                    <div className={INSIGHTS_THEME.small}>High Risk</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-blue-500">
                      {features.filter((f) => f.effort === 'high').length}
                    </div>
                    <div className={INSIGHTS_THEME.small}>High Effort</div>
                  </div>
                </div>

                {/* Top 3 features */}
                {!filters.showAll && (
                  <div>
                    <h4 className={INSIGHTS_THEME.subheading + ' mb-2'}>
                      Top 3 Features
                    </h4>
                    <div className="space-y-2">
                      {top3Features.map((feature, index) => (
                        <FeatureCard key={feature.id} feature={feature} />
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={INSIGHTS_THEME.small + ' mt-2'}
                      onClick={() => handleFilterChange('showAll', true)}
                    >
                      View all features →
                    </Button>
                  </div>
                )}

                {/* Full features list with filters */}
                {filters.showAll && (
                  <div className="space-y-3">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={filters.sortBy}
                        onValueChange={(value: SortBy) =>
                          handleFilterChange('sortBy', value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="priority">
                            Sort by Priority
                          </SelectItem>
                          <SelectItem value="risk">Sort by Risk</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={filters.priority}
                        onValueChange={(value: FilterPriority) =>
                          handleFilterChange('priority', value)
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
                        value={filters.risk}
                        onValueChange={(value: FilterRisk) =>
                          handleFilterChange('risk', value)
                        }
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

                      <div className="flex gap-1">
                        {availableTags.map((tag) => (
                          <Button
                            key={tag}
                            variant={
                              filters.tags.includes(tag) ? 'default' : 'outline'
                            }
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const newTags = filters.tags.includes(tag)
                                ? filters.tags.filter((t) => t !== tag)
                                : [...filters.tags, tag];
                              handleFilterChange('tags', newTags);
                            }}
                          >
                            {tag}
                          </Button>
                        ))}
                      </div>

                      <div className="flex gap-1 ml-auto">
                        <Button
                          variant={
                            filters.viewMode === 'table' ? 'default' : 'outline'
                          }
                          size="sm"
                          className="text-xs"
                          onClick={() =>
                            handleFilterChange('viewMode', 'table')
                          }
                        >
                          <List className="h-3 w-3" />
                        </Button>
                        <Button
                          variant={
                            filters.viewMode === 'card' ? 'default' : 'outline'
                          }
                          size="sm"
                          className="text-xs"
                          onClick={() => handleFilterChange('viewMode', 'card')}
                        >
                          <Grid3X3 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Features display */}
                    {filters.viewMode === 'table' ? (
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
                          {filteredAndSortedFeatures.map((feature) => (
                            <TableRow key={feature.id}>
                              <TableCell className="font-medium">
                                {feature.name}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${PRIORITY_COLORS[feature.priority]}`}
                                >
                                  {feature.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${PRIORITY_COLORS[feature.risk]}`}
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
                                  {feature.impacts.map((impact, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className={`text-xs ${IMPACT_COLORS[impact as keyof typeof IMPACT_COLORS] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
                                    >
                                      {impact}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">
                                  {feature.dependencies.length}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredAndSortedFeatures.map((feature) => (
                          <FeatureCard key={feature.id} feature={feature} />
                        ))}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className={INSIGHTS_THEME.small}
                      onClick={() => handleFilterChange('showAll', false)}
                    >
                      ← Show top 3 only
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
