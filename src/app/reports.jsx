import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getMedicines,
  getRemovalStats,
  getRemovals,
  getSales,
  getSalesAnalytics,
} from '../services/api';

export default function Reports() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('overview');

  const [medicines, setMedicines] = useState([]);
  const [removals, setRemovals] = useState([]);
  const [sales, setSales] = useState([]);

  const [salesAnalytics, setSalesAnalytics] = useState({
    summary: {
      totalBills: 0,
      unitsSold: 0,
      revenue: 0,
      profit: 0,
    },
    topSelling: [],
  });

  const [removalStats, setRemovalStats] = useState({
    totalRemovals: 0,
    totalLoss: '0.00',
    thisMonthRemovals: 0,
    thisMonthLoss: '0.00',
  });

  const [loading, setLoading] = useState(true);

  // =====================================================
  // LOAD REPORT DATA
  // =====================================================

  const loadReports = async () => {
    try {
      setLoading(true);

      const [
        medicineData,
        removalData,
        statsData,
        salesData,
        analyticsData,
      ] = await Promise.all([
        getMedicines(),
        getRemovals(),
        getRemovalStats(),
        getSales(),
        getSalesAnalytics(),
      ]);

      setMedicines(medicineData || []);
      setRemovals(removalData || []);

      setRemovalStats(
        statsData || {
          totalRemovals: 0,
          totalLoss: '0.00',
          thisMonthRemovals: 0,
          thisMonthLoss: '0.00',
        }
      );

      setSales(salesData || []);

      setSalesAnalytics(
        analyticsData || {
          summary: {
            totalBills: 0,
            unitsSold: 0,
            revenue: 0,
            profit: 0,
          },
          topSelling: [],
        }
      );
    } catch (error) {
      console.log('Reports loading error:', error);

      Alert.alert(
        'Error',
        error?.message || 'Failed to load reports'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RELOAD WHEN SCREEN OPENS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  // =====================================================
  // TABS
  // =====================================================

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
    },
    {
      key: 'expiry',
      label: 'Expiry',
    },
    {
      key: 'sales',
      label: 'Sales',
    },
    {
      key: 'stock',
      label: 'Stock',
    },
  ];

  // =====================================================
  // HELPERS
  // =====================================================

  const formatMoney = (value) => {
    return `₹${Number(value || 0).toLocaleString(
      'en-IN',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return 'N/A';
    }

    return d.toLocaleDateString('en-GB');
  };

  const getStatusColor = (status) => {
    if (status === 'critical') return '#C62828';
    if (status === 'warning') return '#B7791F';
    if (status === 'caution') return '#B7791F';
    if (status === 'expired') return '#C62828';
    if (status === 'low') return '#B7791F';
    if (status === 'good') return '#176B52';

    return '#176B52';
  };

  // =====================================================
  // SALE REVENUE
  // =====================================================

  const getSaleRevenue = (sale) => {
    const savedTotal = Number(
      sale?.total || 0
    );

    if (savedTotal > 0) {
      return savedTotal;
    }

    const savedSubtotal = Number(
      sale?.subtotal || 0
    );

    const savedGST = Number(
      sale?.gst || 0
    );

    if (
      savedSubtotal > 0 ||
      savedGST > 0
    ) {
      return savedSubtotal + savedGST;
    }

    let itemSubtotal = 0;

    (sale?.items || []).forEach(
      (item) => {
        const quantity = Number(
          item?.quantity || 0
        );

        const price = Number(
          item?.price || 0
        );

        const itemTotal =
          Number(item?.total || 0) ||
          price * quantity;

        itemSubtotal += itemTotal;
      }
    );

    if (itemSubtotal <= 0) {
      return 0;
    }

    const gst = Math.round(
      itemSubtotal * 0.05
    );

    return itemSubtotal + gst;
  };

  // =====================================================
  // ACTIVE MEDICINES
  // =====================================================

  const activeMedicines =
    medicines.filter(
      (medicine) =>
        medicine.status !== 'removed'
    );

  // =====================================================
  // TOTAL STOCK VALUE
  // =====================================================

  const totalStockValue =
    activeMedicines.reduce(
      (sum, medicine) => {
        const quantity = Number(
          medicine.quantity || 0
        );

        const price = Number(
          medicine.sellingPrice || 0
        );

        return sum + quantity * price;
      },
      0
    );

  // =====================================================
  // EXPIRY REPORT
  // =====================================================

  const expiryReport =
    activeMedicines
      .filter(
        (medicine) =>
          medicine.status === 'expired' ||
          medicine.status === 'critical' ||
          medicine.status === 'warning' ||
          medicine.status === 'caution'
      )
      .sort((a, b) => {
        const order = {
          expired: 1,
          critical: 2,
          warning: 3,
          caution: 4,
        };

        return (
          (order[a.status] || 99) -
          (order[b.status] || 99)
        );
      });

  // =====================================================
  // STOCK REPORT
  // =====================================================

  const stockReport =
    activeMedicines.map(
      (medicine) => {
        const current = Number(
          medicine.quantity || 0
        );

        const min = 50;

        let status = 'good';

        if (current <= 0) {
          status = 'critical';
        } else if (current < min) {
          status = 'low';
        }

        return {
          medicine: medicine.name,
          batch: medicine.batchNumber,
          current,
          min,
          status,
        };
      }
    );

  // =====================================================
  // SALES SUMMARY
  // =====================================================

  const salesSummary =
    salesAnalytics?.summary || {
      totalBills: 0,
      unitsSold: 0,
      revenue: 0,
      profit: 0,
    };

  const totalBills =
    Number(
      salesSummary.totalBills || 0
    );

  const unitsSold =
    Number(
      salesSummary.unitsSold || 0
    );

  const totalRevenue =
    Number(
      salesSummary.revenue || 0
    );

  const totalProfit =
    Number(
      salesSummary.profit || 0
    );

  // =====================================================
  // TOP SELLING
  // =====================================================

  const salesReport =
    salesAnalytics?.topSelling || [];

  // =====================================================
  // MONTHLY REVENUE
  // =====================================================

  const getMonthlyRevenue = () => {
    const now = new Date();

    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      months.push({
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        month: date.toLocaleString(
          'en-US',
          {
            month: 'short',
          }
        ),
        value: 0,
      });
    }

    sales.forEach((sale) => {
      const saleDate = new Date(
        sale.createdAt
      );

      if (
        Number.isNaN(
          saleDate.getTime()
        )
      ) {
        return;
      }

      const monthData =
        months.find(
          (item) =>
            item.year ===
              saleDate.getFullYear() &&
            item.monthIndex ===
              saleDate.getMonth()
        );

      if (monthData) {
        monthData.value +=
          getSaleRevenue(sale);
      }
    });

    const maxValue = Math.max(
      ...months.map(
        (item) => item.value
      ),
      1
    );

    return months.map((item) => ({
      ...item,

      bar:
        item.value > 0
          ? Math.max(
              8,
              (item.value /
                maxValue) *
                100
            )
          : 0,
    }));
  };

  const monthlyData =
    getMonthlyRevenue();

  // =====================================================
  // CURRENT MONTH REVENUE
  // =====================================================

  const currentMonthRevenue =
    (() => {
      const now = new Date();

      return sales.reduce(
        (sum, sale) => {
          const saleDate =
            new Date(
              sale.createdAt
            );

          if (
            Number.isNaN(
              saleDate.getTime()
            )
          ) {
            return sum;
          }

          if (
            saleDate.getMonth() ===
              now.getMonth() &&
            saleDate.getFullYear() ===
              now.getFullYear()
          ) {
            return (
              sum +
              getSaleRevenue(sale)
            );
          }

          return sum;
        },
        0
      );
    })();

  // =====================================================
  // DEAD STOCK
  // =====================================================

  const DEAD_STOCK_DAYS = 90;

  const deadStockReport =
    activeMedicines
      .map((medicine) => {
        const medicineId =
          String(
            medicine._id ||
              medicine.id ||
              ''
          );

        const quantity =
          Number(
            medicine.quantity || 0
          );

        const sellingPrice =
          Number(
            medicine.sellingPrice || 0
          );

        const stockValue =
          quantity *
          sellingPrice;

        let lastSaleDate = null;

        sales.forEach((sale) => {
          const saleDate =
            new Date(
              sale.createdAt
            );

          if (
            Number.isNaN(
              saleDate.getTime()
            )
          ) {
            return;
          }

          const medicineWasSold =
            (sale.items || []).some(
              (item) =>
                String(
                  item.medicine || ''
                ) === medicineId
            );

          if (medicineWasSold) {
            if (
              !lastSaleDate ||
              saleDate >
                lastSaleDate
            ) {
              lastSaleDate =
                saleDate;
            }
          }
        });

        let referenceDate;

        if (lastSaleDate) {
          referenceDate =
            lastSaleDate;
        } else if (
          medicine.createdAt
        ) {
          referenceDate =
            new Date(
              medicine.createdAt
            );
        } else {
          return null;
        }

        if (
          Number.isNaN(
            referenceDate.getTime()
          )
        ) {
          return null;
        }

        const now = new Date();

        const diffMs =
          now.getTime() -
          referenceDate.getTime();

        const daysSinceActivity =
          Math.floor(
            diffMs /
              (1000 *
                60 *
                60 *
                24)
          );

        if (
          quantity <= 0 ||
          daysSinceActivity <
            DEAD_STOCK_DAYS
        ) {
          return null;
        }

        return {
          _id: medicine._id,
          name: medicine.name,
          batch:
            medicine.batchNumber ||
            'N/A',
          quantity,
          sellingPrice,
          stockValue,
          lastSaleDate,
          daysSinceSale:
            daysSinceActivity,
          neverSold:
            !lastSaleDate,
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.daysSinceSale -
          a.daysSinceSale
      );

  const deadStockValue =
    deadStockReport.reduce(
      (sum, item) =>
        sum +
        Number(
          item.stockValue || 0
        ),
      0
    );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <View
          style={styles.loadingIconBox}
        >
          <Text
            style={styles.loadingIcon}
          >
            R
          </Text>
        </View>

        <ActivityIndicator
          size="small"
          color="#176B52"
        />

        <Text
          style={styles.loadingTitle}
        >
          Loading Reports
        </Text>

        <Text
          style={styles.loadingText}
        >
          Preparing your pharmacy
          analytics...
        </Text>
      </View>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <View style={styles.container}>

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={styles.backArrow}
          >
            ←
          </Text>

          <Text
            style={styles.backText}
          >
            Back
          </Text>
        </TouchableOpacity>

        <View
          style={styles.headerCenter}
        >
          <Text
            style={styles.headerTitle}
          >
            Reports
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Pharmacy analytics
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadReports}
        >
          <Text
            style={styles.refreshText}
          >
            ↻
          </Text>
        </TouchableOpacity>

      </View>

      {/* =================================================
          TABS
      ================================================= */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        style={styles.tabScroll}
        contentContainerStyle={
          styles.tabContent
        }
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab ===
                tab.key &&
                styles.activeTab,
            ]}
            onPress={() =>
              setActiveTab(
                tab.key
              )
            }
          >
            <Text
              style={[
                styles.tabText,
                activeTab ===
                  tab.key &&
                  styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* =================================================
            OVERVIEW
        ================================================= */}

        {activeTab ===
          'overview' && (
          <View>

            {/* STATS */}

            <Text
              style={styles.sectionTitle}
            >
              Overview
            </Text>

            <View
              style={styles.statsGrid}
            >

              <View
                style={styles.statCard}
              >
                <View
                  style={[
                    styles.statIconBox,
                    styles.greenIconBox,
                  ]}
                >
                  <Text
                    style={
                      styles.statIconText
                    }
                  >
                    M
                  </Text>
                </View>

                <Text
                  style={
                    styles.statValue
                  }
                >
                  {medicines.length}
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Total Medicines
                </Text>
              </View>

              <View
                style={styles.statCard}
              >
                <View
                  style={[
                    styles.statIconBox,
                    styles.greenIconBox,
                  ]}
                >
                  <Text
                    style={
                      styles.statIconText
                    }
                  >
                    ₹
                  </Text>
                </View>

                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        '#176B52',
                    },
                  ]}
                >
                  {formatMoney(
                    totalStockValue
                  )}
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Stock Value
                </Text>
              </View>

              <View
                style={styles.statCard}
              >
                <View
                  style={[
                    styles.statIconBox,
                    styles.greenIconBox,
                  ]}
                >
                  <Text
                    style={
                      styles.statIconText
                    }
                  >
                    ₹
                  </Text>
                </View>

                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        '#176B52',
                    },
                  ]}
                >
                  {formatMoney(
                    currentMonthRevenue
                  )}
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Monthly Revenue
                </Text>
              </View>

              <View
                style={styles.statCard}
              >
                <View
                  style={[
                    styles.statIconBox,
                    styles.redIconBox,
                  ]}
                >
                  <Text
                    style={
                      styles.statIconTextRed
                    }
                  >
                    !
                  </Text>
                </View>

                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        '#C62828',
                    },
                  ]}
                >
                  {formatMoney(
                    removalStats.totalLoss
                  )}
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Expired Loss
                </Text>
              </View>

            </View>

            {/* MONTHLY REVENUE */}

            <View
              style={styles.card}
            >
              <View
                style={
                  styles.cardHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    Monthly Revenue
                  </Text>

                  <Text
                    style={
                      styles.cardSubtitle
                    }
                  >
                    Last 6 months
                  </Text>
                </View>

                <View
                  style={
                    styles.smallBadge
                  }
                >
                  <Text
                    style={
                      styles.smallBadgeText
                    }
                  >
                    Revenue
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.chartContainer
                }
              >
                {monthlyData.map(
                  (item, index) => (
                    <View
                      key={`${item.year}-${item.monthIndex}`}
                      style={
                        styles.barItem
                      }
                    >
                      <Text
                        style={
                          styles.barValue
                        }
                      >
                        {item.value > 0
                          ? `₹${(
                              item.value /
                              1000
                            ).toFixed(
                              1
                            )}k`
                          : '₹0'}
                      </Text>

                      <View
                        style={
                          styles.barBackground
                        }
                      >
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${item.bar}%`,
                              backgroundColor:
                                index ===
                                monthlyData.length -
                                  1
                                  ? '#176B52'
                                  : '#A8D5C8',
                            },
                          ]}
                        />
                      </View>

                      <Text
                        style={
                          styles.barMonth
                        }
                      >
                        {item.month}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>

            {/* SALES SUMMARY */}

            <View
              style={styles.card}
            >
              <Text
                style={
                  styles.cardTitle
                }
              >
                Sales Summary
              </Text>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Total Bills
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {totalBills}
                </Text>
              </View>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Units Sold
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {unitsSold}
                </Text>
              </View>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Total Revenue
                </Text>

                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        '#176B52',
                    },
                  ]}
                >
                  {formatMoney(
                    totalRevenue
                  )}
                </Text>
              </View>

              <View
                style={[
                  styles.summaryRow,
                  styles.lastSummaryRow,
                ]}
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Total Profit
                </Text>

                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        '#176B52',
                    },
                  ]}
                >
                  {formatMoney(
                    totalProfit
                  )}
                </Text>
              </View>
            </View>

            {/* REMOVAL SUMMARY */}

            <View
              style={styles.card}
            >
              <Text
                style={
                  styles.cardTitle
                }
              >
                Removal Summary
              </Text>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Total Removed
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {
                    removalStats.totalRemovals
                  }
                </Text>
              </View>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Total Financial Loss
                </Text>

                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        '#C62828',
                    },
                  ]}
                >
                  {formatMoney(
                    removalStats.totalLoss
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  This Month Removed
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {
                    removalStats.thisMonthRemovals
                  }
                </Text>
              </View>

              <View
                style={[
                  styles.summaryRow,
                  styles.lastSummaryRow,
                ]}
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  This Month Loss
                </Text>

                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        '#C62828',
                    },
                  ]}
                >
                  {formatMoney(
                    removalStats.thisMonthLoss
                  )}
                </Text>
              </View>
            </View>

            {/* CURRENT SUMMARY */}

            <View
              style={styles.card}
            >
              <Text
                style={
                  styles.cardTitle
                }
              >
                Current Inventory
              </Text>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Total Medicines
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {medicines.length}
                </Text>
              </View>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Active Stock Records
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {
                    activeMedicines.length
                  }
                </Text>
              </View>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Expiry Alerts
                </Text>

                <Text
                  style={[
                    styles.summaryValue,
                    expiryReport.length >
                      0 && {
                        color:
                          '#B7791F',
                      },
                  ]}
                >
                  {
                    expiryReport.length
                  }
                </Text>
              </View>

              <View
                style={[
                  styles.summaryRow,
                  styles.lastSummaryRow,
                ]}
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Removed This Month
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {
                    removalStats.thisMonthRemovals
                  }
                </Text>
              </View>
            </View>

          </View>
        )}

        {/* =================================================
            EXPIRY TAB
        ================================================= */}

        {activeTab ===
          'expiry' && (
          <View>

            <View
              style={styles.card}
            >
              <View
                style={
                  styles.cardHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    Expiry Status
                  </Text>

                  <Text
                    style={
                      styles.cardSubtitle
                    }
                  >
                    Medicines requiring attention
                  </Text>
                </View>

                <View
                  style={
                    styles.warningBadge
                  }
                >
                  <Text
                    style={
                      styles.warningBadgeText
                    }
                  >
                    {
                      expiryReport.length
                    }
                  </Text>
                </View>
              </View>

              {expiryReport.length ===
              0 ? (
                <View
                  style={
                    styles.emptyContainer
                  }
                >
                  <View
                    style={
                      styles.emptyIconBox
                    }
                  >
                    <Text
                      style={
                        styles.emptyIconText
                      }
                    >
                      ✓
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No Expiry Alerts
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    All active medicines
                    are currently safe.
                  </Text>
                </View>
              ) : (
                expiryReport.map(
                  (item, index) => {
                    const value =
                      Number(
                        item.quantity ||
                          0
                      ) *
                      Number(
                        item.sellingPrice ||
                          0
                      );

                    const statusColor =
                      getStatusColor(
                        item.status
                      );

                    return (
                      <View
                        key={
                          item._id ||
                          index
                        }
                        style={[
                          styles.reportRow,
                          {
                            borderLeftColor:
                              statusColor,
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.reportLeft
                          }
                        >
                          <Text
                            style={
                              styles.reportName
                            }
                          >
                            {item.name}
                          </Text>

                          <Text
                            style={
                              styles.reportSub
                            }
                          >
                            Batch:{' '}
                            {item.batchNumber ||
                              'N/A'}
                          </Text>

                          <Text
                            style={
                              styles.reportSub
                            }
                          >
                            Exp:{' '}
                            {formatDate(
                              item.expiryDate
                            )}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.reportRight
                          }
                        >
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  statusColor +
                                  '12',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.reportStatus,
                                {
                                  color:
                                    statusColor,
                                },
                              ]}
                            >
                              {(
                                item.status ||
                                'unknown'
                              ).toUpperCase()}
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.reportQty
                            }
                          >
                            {item.quantity ||
                              0}{' '}
                            units
                          </Text>

                          <Text
                            style={
                              styles.reportValue
                            }
                          >
                            {formatMoney(
                              value
                            )}
                          </Text>
                        </View>
                      </View>
                    );
                  }
                )
              )}
            </View>

            {/* LOSS */}

            <View
              style={[
                styles.card,
                styles.dangerCard,
              ]}
            >
              <Text
                style={
                  styles.cardTitle
                }
              >
                Expired Medicine Loss
              </Text>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Total Removed
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {
                    removalStats.totalRemovals
                  }
                </Text>
              </View>

              <View
                style={
                  styles.summaryRow
                }
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  This Month Removed
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {
                    removalStats.thisMonthRemovals
                  }
                </Text>
              </View>

              <View
                style={[
                  styles.summaryRow,
                  styles.lastSummaryRow,
                ]}
              >
                <Text
                  style={
                    styles.dangerLabel
                  }
                >
                  Total Financial Loss
                </Text>

                <Text
                  style={
                    styles.dangerValue
                  }
                >
                  {formatMoney(
                    removalStats.totalLoss
                  )}
                </Text>
              </View>
            </View>

            {/* REMOVAL HISTORY */}

            <View
              style={styles.card}
            >
              <Text
                style={
                  styles.cardTitle
                }
              >
                Removal History
              </Text>

              {removals.length ===
              0 ? (
                <Text
                  style={
                    styles.emptyText
                  }
                >
                  No medicines removed yet.
                </Text>
              ) : (
                removals
                  .slice(0, 10)
                  .map(
                    (item, index) => (
                      <View
                        key={
                          item._id ||
                          index
                        }
                        style={
                          styles.historyRow
                        }
                      >
                        <View
                          style={
                            styles.historyLeft
                          }
                        >
                          <Text
                            style={
                              styles.historyName
                            }
                          >
                            {
                              item.medicineName
                            }
                          </Text>

                          <Text
                            style={
                              styles.historySub
                            }
                          >
                            Batch:{' '}
                            {
                              item.batchNumber
                            }
                          </Text>

                          <Text
                            style={
                              styles.historySub
                            }
                          >
                            Qty:{' '}
                            {
                              item.quantity
                            }{' '}
                            units
                          </Text>

                          <Text
                            style={
                              styles.historySub
                            }
                          >
                            Date:{' '}
                            {formatDate(
                              item.removalDate
                            )}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.historyRight
                          }
                        >
                          <Text
                            style={
                              styles.historyLoss
                            }
                          >
                            {formatMoney(
                              item.financialLoss
                            )}
                          </Text>

                          <Text
                            style={
                              styles.historyQR
                            }
                          >
                            {item.qrScanned
                              ? 'QR Verified'
                              : 'No QR'}
                          </Text>
                        </View>
                      </View>
                    )
                  )
              )}
            </View>

          </View>
        )}

        {/* =================================================
            SALES TAB
        ================================================= */}

        {activeTab ===
          'sales' && (
          <View>

            <View
              style={styles.card}
            >
              <View
                style={
                  styles.cardHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    Top Selling Medicines
                  </Text>

                  <Text
                    style={
                      styles.cardSubtitle
                    }
                  >
                    Based on sales analytics
                  </Text>
                </View>
              </View>

              {salesReport.length ===
              0 ? (
                <View
                  style={
                    styles.emptyContainer
                  }
                >
                  <View
                    style={
                      styles.emptyIconBox
                    }
                  >
                    <Text
                      style={
                        styles.emptyIconText
                      }
                    >
                      S
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No Sales Yet
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Sales will appear
                    here after billing
                    transactions.
                  </Text>
                </View>
              ) : (
                salesReport.map(
                  (item, index) => (
                    <View
                      key={
                        item.medicineId ||
                        index
                      }
                      style={
                        styles.salesRow
                      }
                    >
                      <View
                        style={
                          styles.rankBadge
                        }
                      >
                        <Text
                          style={
                            styles.rankText
                          }
                        >
                          #
                          {item.rank ||
                            index + 1}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.salesLeft
                        }
                      >
                        <Text
                          style={
                            styles.salesName
                          }
                        >
                          {
                            item.medicineName
                          }
                        </Text>

                        <Text
                          style={
                            styles.salesSold
                          }
                        >
                          {Number(
                            item.unitsSold ||
                              0
                          ).toLocaleString(
                            'en-IN'
                          )}{' '}
                          units sold
                        </Text>
                      </View>

                      <View
                        style={
                          styles.salesRight
                        }
                      >
                        <Text
                          style={
                            styles.salesRevenue
                          }
                        >
                          {formatMoney(
                            item.revenue
                          )}
                        </Text>

                        <Text
                          style={
                            styles.salesTrend
                          }
                        >
                          Sales
                        </Text>
                      </View>
                    </View>
                  )
                )
              )}
            </View>

            {/* TOTAL SALES */}

            <View
              style={
                styles.salesSummaryCard
              }
            >
              <Text
                style={
                  styles.salesSummaryTitle
                }
              >
                Total Sales Summary
              </Text>

              <View
                style={
                  styles.salesSummaryGrid
                }
              >
                <View
                  style={
                    styles.salesSummaryItem
                  }
                >
                  <Text
                    style={
                      styles.salesSummaryValue
                    }
                  >
                    {totalBills.toLocaleString(
                      'en-IN'
                    )}
                  </Text>

                  <Text
                    style={
                      styles.salesSummaryLabel
                    }
                  >
                    Bills
                  </Text>
                </View>

                <View
                  style={
                    styles.salesSummaryItem
                  }
                >
                  <Text
                    style={
                      styles.salesSummaryValue
                    }
                  >
                    {unitsSold.toLocaleString(
                      'en-IN'
                    )}
                  </Text>

                  <Text
                    style={
                      styles.salesSummaryLabel
                    }
                  >
                    Units Sold
                  </Text>
                </View>

                <View
                  style={
                    styles.salesSummaryItem
                  }
                >
                  <Text
                    style={
                      styles.salesSummaryValue
                    }
                  >
                    {formatMoney(
                      totalRevenue
                    )}
                  </Text>

                  <Text
                    style={
                      styles.salesSummaryLabel
                    }
                  >
                    Revenue
                  </Text>
                </View>

                <View
                  style={
                    styles.salesSummaryItem
                  }
                >
                  <Text
                    style={
                      styles.salesSummaryValue
                    }
                  >
                    {formatMoney(
                      totalProfit
                    )}
                  </Text>

                  <Text
                    style={
                      styles.salesSummaryLabel
                    }
                  >
                    Profit
                  </Text>
                </View>
              </View>
            </View>

          </View>
        )}

        {/* =================================================
            STOCK TAB
        ================================================= */}

        {activeTab ===
          'stock' && (
          <View>

            {/* CURRENT STOCK */}

            <View
              style={styles.card}
            >
              <View
                style={
                  styles.cardHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    Current Stock
                  </Text>

                  <Text
                    style={
                      styles.cardSubtitle
                    }
                  >
                    Current inventory status
                  </Text>
                </View>
              </View>

              {stockReport.length ===
              0 ? (
                <Text
                  style={
                    styles.emptyText
                  }
                >
                  No medicines available.
                </Text>
              ) : (
                stockReport.map(
                  (item, index) => {
                    const statusColor =
                      getStatusColor(
                        item.status
                      );

                    return (
                      <View
                        key={index}
                        style={
                          styles.stockRow
                        }
                      >
                        <View
                          style={
                            styles.stockLeft
                          }
                        >
                          <Text
                            style={
                              styles.stockName
                            }
                          >
                            {
                              item.medicine
                            }
                          </Text>

                          <Text
                            style={
                              styles.stockSub
                            }
                          >
                            Batch:{' '}
                            {item.batch ||
                              'N/A'}
                          </Text>

                          <Text
                            style={
                              styles.stockSub
                            }
                          >
                            Minimum:{' '}
                            {item.min}{' '}
                            units
                          </Text>
                        </View>

                        <View
                          style={
                            styles.stockRight
                          }
                        >
                          <Text
                            style={[
                              styles.stockQty,
                              {
                                color:
                                  statusColor,
                              },
                            ]}
                          >
                            {item.current}
                          </Text>

                          <View
                            style={[
                              styles.stockBadge,
                              {
                                backgroundColor:
                                  statusColor +
                                  '12',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stockBadgeText,
                                {
                                  color:
                                    statusColor,
                                },
                              ]}
                            >
                              {item.status ===
                              'good'
                                ? 'Good'
                                : item.status ===
                                  'low'
                                ? 'Low'
                                : 'Critical'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  }
                )
              )}
            </View>

            {/* DEAD STOCK */}

            <View
              style={[
                styles.card,
                styles.warningCard,
              ]}
            >
              <View
                style={
                  styles.cardHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    Dead Stock
                  </Text>

                  <Text
                    style={
                      styles.cardSubtitle
                    }
                  >
                    No sales for 90+ days
                  </Text>
                </View>

                <View
                  style={
                    styles.warningBadge
                  }
                >
                  <Text
                    style={
                      styles.warningBadgeText
                    }
                  >
                    {
                      deadStockReport.length
                    }
                  </Text>
                </View>
              </View>

              {/* DEAD STOCK SUMMARY */}

              <View
                style={
                  styles.deadStockSummary
                }
              >
                <View
                  style={
                    styles.deadStockSummaryItem
                  }
                >
                  <Text
                    style={
                      styles.deadStockValue
                    }
                  >
                    {
                      deadStockReport.length
                    }
                  </Text>

                  <Text
                    style={
                      styles.deadStockLabel
                    }
                  >
                    Medicines
                  </Text>
                </View>

                <View
                  style={
                    styles.deadStockSummaryItem
                  }
                >
                  <Text
                    style={[
                      styles.deadStockValue,
                      {
                        color:
                          '#B7791F',
                      },
                    ]}
                  >
                    {formatMoney(
                      deadStockValue
                    )}
                  </Text>

                  <Text
                    style={
                      styles.deadStockLabel
                    }
                  >
                    Stock Value
                  </Text>
                </View>
              </View>

              {deadStockReport.length ===
              0 ? (
                <View
                  style={
                    styles.emptyContainer
                  }
                >
                  <View
                    style={
                      styles.emptyIconBox
                    }
                  >
                    <Text
                      style={
                        styles.emptyIconText
                      }
                    >
                      ✓
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No Dead Stock
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    All active medicines
                    are moving normally.
                  </Text>
                </View>
              ) : (
                deadStockReport.map(
                  (item, index) => (
                    <View
                      key={
                        item._id ||
                        index
                      }
                      style={
                        styles.deadStockRow
                      }
                    >
                      <View
                        style={
                          styles.deadStockLeft
                        }
                      >
                        <Text
                          style={
                            styles.deadStockName
                          }
                        >
                          {item.name}
                        </Text>

                        <Text
                          style={
                            styles.deadStockSub
                          }
                        >
                          Batch:{' '}
                          {item.batch}
                        </Text>

                        <Text
                          style={
                            styles.deadStockSub
                          }
                        >
                          Stock:{' '}
                          {item.quantity}{' '}
                          units
                        </Text>

                        <Text
                          style={
                            styles.deadStockSub
                          }
                        >
                          {item.neverSold
                            ? 'Never sold'
                            : `Last sold: ${formatDate(
                                item.lastSaleDate
                              )}`}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.deadStockRight
                        }
                      >
                        <Text
                          style={
                            styles.deadStockDays
                          }
                        >
                          {
                            item.daysSinceSale
                          }{' '}
                          days
                        </Text>

                        <Text
                          style={
                            styles.deadStockMoney
                          }
                        >
                          {formatMoney(
                            item.stockValue
                          )}
                        </Text>

                        <Text
                          style={
                            styles.deadStockWarning
                          }
                        >
                          Slow Moving
                        </Text>
                      </View>
                    </View>
                  )
                )
              )}
            </View>

          </View>
        )}

        <View
          style={styles.bottomSpace}
        />

      </ScrollView>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F6F8F7',
    paddingHorizontal: 16,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  // ===================================================
  // LOADING
  // ===================================================

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F6F8F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },

  loadingIconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#EAF5F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  loadingIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#176B52',
  },

  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17211D',
    marginTop: 12,
  },

  loadingText: {
    fontSize: 11,
    color: '#7A8782',
    marginTop: 5,
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 14,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
  },

  backArrow: {
    fontSize: 23,
    color: '#176B52',
  },

  backText: {
    fontSize: 13,
    color: '#176B52',
    fontWeight: '600',
    marginLeft: 3,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#17211D',
  },

  headerSubtitle: {
    fontSize: 10,
    color: '#7A8782',
    marginTop: 2,
  },

  refreshButton: {
    width: 70,
    alignItems: 'flex-end',
  },

  refreshText: {
    fontSize: 28,
    color: '#176B52',
  },

  // ===================================================
  // TABS
  // ===================================================

  tabScroll: {
    marginBottom: 16,
  },

  tabContent: {
    gap: 8,
  },

  tab: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5E1',
    borderRadius: 20,
    paddingHorizontal: 17,
    paddingVertical: 9,
  },

  activeTab: {
    backgroundColor: '#176B52',
    borderColor: '#176B52',
  },

  tabText: {
    fontSize: 12,
    color: '#64736D',
    fontWeight: '600',
  },

  activeTabText: {
    color: '#FFFFFF',
  },

  // ===================================================
  // SECTION
  // ===================================================

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17211D',
    marginBottom: 12,
  },

  // ===================================================
  // STATS
  // ===================================================

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 16,
  },

  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E7E3',
  },

  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  greenIconBox: {
    backgroundColor: '#EAF5F1',
  },

  redIconBox: {
    backgroundColor: '#FDECEC',
  },

  statIconText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#176B52',
  },

  statIconTextRed: {
    fontSize: 17,
    fontWeight: '800',
    color: '#C62828',
  },

  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17211D',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 10,
    color: '#7A8782',
  },

  // ===================================================
  // CARD
  // ===================================================

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0E7E3',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 13,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17211D',
  },

  cardSubtitle: {
    fontSize: 10,
    color: '#84908B',
    marginTop: 3,
  },

  smallBadge: {
    backgroundColor: '#EAF5F1',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  smallBadgeText: {
    fontSize: 9,
    color: '#176B52',
    fontWeight: '700',
  },

  // ===================================================
  // CHART
  // ===================================================

  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 175,
    paddingTop: 20,
  },

  barItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },

  barValue: {
    fontSize: 8,
    color: '#7A8782',
    marginBottom: 5,
  },

  barBackground: {
    width: 25,
    height: 105,
    backgroundColor: '#F0F3F1',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },

  barFill: {
    width: '100%',
    borderRadius: 6,
  },

  barMonth: {
    fontSize: 9,
    color: '#7A8782',
    marginTop: 6,
  },

  // ===================================================
  // SUMMARY
  // ===================================================

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1EF',
  },

  lastSummaryRow: {
    borderBottomWidth: 0,
  },

  summaryLabel: {
    fontSize: 12,
    color: '#718078',
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17211D',
  },

  // ===================================================
  // EXPIRY
  // ===================================================

  warningBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF7E6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  warningBadgeText: {
    color: '#B7791F',
    fontSize: 11,
    fontWeight: '800',
  },

  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingLeft: 11,
    paddingRight: 8,
    marginBottom: 9,
    borderLeftWidth: 3,
    backgroundColor: '#F8FAF9',
    borderRadius: 9,
  },

  reportLeft: {
    flex: 1,
    paddingRight: 8,
  },

  reportName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17211D',
  },

  reportSub: {
    fontSize: 10,
    color: '#7A8782',
    marginTop: 4,
  },

  reportRight: {
    alignItems: 'flex-end',
  },

  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },

  reportStatus: {
    fontSize: 8,
    fontWeight: '800',
  },

  reportQty: {
    fontSize: 10,
    color: '#718078',
  },

  reportValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#17211D',
    marginTop: 2,
  },

  dangerCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#C62828',
  },

  dangerLabel: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
  },

  dangerValue: {
    fontSize: 16,
    color: '#C62828',
    fontWeight: '800',
  },

  // ===================================================
  // EMPTY
  // ===================================================

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 15,
  },

  emptyIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EAF5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  emptyIconText: {
    fontSize: 25,
    color: '#176B52',
    fontWeight: '700',
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#176B52',
    marginBottom: 5,
  },

  emptyText: {
    fontSize: 11,
    color: '#7A8782',
    textAlign: 'center',
    lineHeight: 17,
  },

  // ===================================================
  // HISTORY
  // ===================================================

  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1EF',
  },

  historyLeft: {
    flex: 1,
    paddingRight: 10,
  },

  historyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17211D',
  },

  historySub: {
    fontSize: 10,
    color: '#7A8782',
    marginTop: 3,
  },

  historyRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  historyLoss: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '700',
  },

  historyQR: {
    fontSize: 9,
    color: '#176B52',
    fontWeight: '600',
    marginTop: 4,
  },

  // ===================================================
  // SALES
  // ===================================================

  salesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1EF',
  },

  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#EAF5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  rankText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#176B52',
  },

  salesLeft: {
    flex: 1,
  },

  salesName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17211D',
  },

  salesSold: {
    fontSize: 10,
    color: '#7A8782',
    marginTop: 3,
  },

  salesRight: {
    alignItems: 'flex-end',
  },

  salesRevenue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#176B52',
  },

  salesTrend: {
    fontSize: 9,
    color: '#84908B',
    marginTop: 3,
  },

  salesSummaryCard: {
    backgroundColor: '#176B52',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  salesSummaryTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },

  salesSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  salesSummaryItem: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#1D755C',
    borderRadius: 10,
    alignItems: 'center',
  },

  salesSummaryValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  salesSummaryLabel: {
    color: '#DCEDE7',
    fontSize: 9,
    marginTop: 3,
  },

  // ===================================================
  // STOCK
  // ===================================================

  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1EF',
  },

  stockLeft: {
    flex: 1,
    paddingRight: 10,
  },

  stockName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17211D',
  },

  stockSub: {
    fontSize: 10,
    color: '#7A8782',
    marginTop: 3,
  },

  stockRight: {
    alignItems: 'flex-end',
  },

  stockQty: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 5,
  },

  stockBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  stockBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },

  warningCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#B7791F',
  },

  deadStockSummary: {
    flexDirection: 'row',
    backgroundColor: '#FFF9ED',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },

  deadStockSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  deadStockValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#17211D',
  },

  deadStockLabel: {
    fontSize: 9,
    color: '#8A806C',
    marginTop: 3,
  },

  deadStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE3',
  },

  deadStockLeft: {
    flex: 1,
    paddingRight: 10,
  },

  deadStockName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17211D',
  },

  deadStockSub: {
    fontSize: 10,
    color: '#7A8782',
    marginTop: 3,
  },

  deadStockRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  deadStockDays: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B7791F',
  },

  deadStockMoney: {
    fontSize: 11,
    fontWeight: '700',
    color: '#17211D',
    marginTop: 3,
  },

  deadStockWarning: {
    fontSize: 8,
    color: '#B7791F',
    marginTop: 4,
    fontWeight: '700',
  },

  bottomSpace: {
    height: 30,
  },
});