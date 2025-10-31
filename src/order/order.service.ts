import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Order } from './order.entity'
import { OrderItem } from './order-item.entity'
import { CreateOrderDto } from './dto/create-order.dto'
import { Product } from '../product/product.entity'
import { Company } from '../company/company.entity'

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId?: number): Promise<Order> {
    
    // 生成訂單編號
    const orderNumber = await this.generateOrderNumber()

    // 建立訂單
    const order = this.orderRepository.create({
      order_number: orderNumber,
      customer_name: createOrderDto.customer_name,
      customer_phone: createOrderDto.customer_phone,
      customer_email: createOrderDto.customer_email,
      shipping_address: createOrderDto.shipping_address,
      shipping_method_id: createOrderDto.shipping_method_id,
      shipping_method_name: createOrderDto.shipping_method_name,
      shipping_fee: createOrderDto.shipping_fee || 0,
      payment_method: createOrderDto.payment_method,
      total_amount: createOrderDto.total_amount,
      notes: createOrderDto.notes,
      company: createOrderDto.company,
      user_id: userId,
      status: 'pending'
    })

    const savedOrder = await this.orderRepository.save(order)

    // 建立訂單項目並檢查庫存
    const orderItems: OrderItem[] = []
    for (const item of createOrderDto.items) {
      // 獲取商品資訊（包含變體）
      const product = await this.productRepository.findOne({
        where: { id: item.product_id },
        relations: ['variants']
      })

      if (!product) {
        throw new NotFoundException(`商品 ID ${item.product_id} 不存在`)
      }

      // 檢查庫存是否足夠
      let stockToCheck = product.stock_quantity
      let variantToUpdate: any = null

      // 如果有變體，檢查變體庫存
      if (product.variants && product.variants.length > 0) {
        let matchingVariant: any = null
        
        // 優先使用 variant_id 來找變體
        if (item.variant_id) {
          matchingVariant = product.variants.find(variant => variant.id === item.variant_id) || null
        }
        
        // 如果沒有 variant_id 或找不到，則使用規格匹配
        if (!matchingVariant && item.selected_specs && Object.keys(item.selected_specs).length > 0) {
          matchingVariant = product.variants.find(variant => {
            return Object.entries(item.selected_specs!).every(([key, value]) => 
              variant.variant_options[key] === value
            )
          }) || null
        }

        if (matchingVariant) {
          stockToCheck = matchingVariant.stock_quantity
          variantToUpdate = matchingVariant
        }
      }

      if (stockToCheck < item.quantity) {
        const productDisplayName = variantToUpdate && item.selected_specs
          ? `${product.name} (${Object.entries(item.selected_specs).map(([k, v]) => `${k}:${v}`).join(', ')})`
          : product.name
        throw new BadRequestException(`商品 "${productDisplayName}" 庫存不足，目前庫存：${stockToCheck}，需求數量：${item.quantity}`)
      }

      // 扣減庫存
      if (variantToUpdate) {
        // 扣減變體庫存
        variantToUpdate.stock_quantity -= item.quantity
        await this.productRepository.save(product) // 保存整個商品（包含變體）
      } else {
        // 扣減主商品庫存
        product.stock_quantity -= item.quantity
        await this.productRepository.save(product)
      }

      // 決定要使用的縮圖
      let thumbnailToUse = product.thumbnail
      
      // 如果有變體且變體有圖片，優先使用變體的第一張圖片
      if (variantToUpdate && variantToUpdate.images && variantToUpdate.images.length > 0) {
        thumbnailToUse = variantToUpdate.images[0]
      }

      const orderItem = this.orderItemRepository.create({
        order_id: savedOrder.id,
        product_id: item.product_id,
        product_name: item.product_name || product.name,
        product_sku: item.product_sku || product.sku,
        quantity: item.quantity,
        price: item.price,
        product_thumbnail: thumbnailToUse,
        product_variant_id: variantToUpdate ? variantToUpdate.id : null,
        variant_name: variantToUpdate ? variantToUpdate.variant_name : null,
        variant_options: item.selected_specs && Object.keys(item.selected_specs).length > 0 ? item.selected_specs : null
      })

      orderItems.push(orderItem)
    }

    await this.orderItemRepository.save(orderItems)

    // 返回完整的訂單資訊
    return this.findOne(savedOrder.id)
  }

  async findAll(
    company: string, 
    page: number = 1, 
    limit: number = 20,
    filters?: {
      status?: string,
      search?: string,
      paymentMethod?: string,
      startDate?: string,
      endDate?: string,
      productName?: string
    }
  ): Promise<{ data: Order[], total: number }> {
    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.company = :company', { company })

    // 狀態篩選
    if (filters?.status && filters.status !== 'all') {
      queryBuilder.andWhere('order.status = :status', { status: filters.status })
    }

    // 搜尋條件（訂單編號、客戶姓名、電話）
    if (filters?.search) {
      queryBuilder.andWhere(
        '(order.order_number ILIKE :search OR order.customer_name ILIKE :search OR order.customer_phone ILIKE :search)',
        { search: `%${filters.search}%` }
      )
    }

    // 付款方式篩選
    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      queryBuilder.andWhere('order.payment_method = :paymentMethod', { paymentMethod: filters.paymentMethod })
    }

    // 日期範圍篩選
    if (filters?.startDate) {
      queryBuilder.andWhere('order.created_at >= :startDate', { startDate: filters.startDate })
    }
    if (filters?.endDate) {
      queryBuilder.andWhere('order.created_at <= :endDate', { endDate: filters.endDate })
    }
    
    // ✅ 修復：如果沒有指定日期範圍，預設只顯示最近3天的訂單
    if (!filters?.startDate && !filters?.endDate) {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0); // 設定為當天開始時間
      
      queryBuilder.andWhere('order.created_at >= :defaultStartDate', { 
        defaultStartDate: threeDaysAgo.toISOString() 
      });
    }

    // 商品名稱篩選
    if (filters?.productName) {
      queryBuilder.andWhere('items.product_name ILIKE :productName', { productName: `%${filters.productName}%` })
    }

    // 排序和分頁
    queryBuilder
      .orderBy('order.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    const [orders, total] = await queryBuilder.getManyAndCount()

    // 為每個訂單項目添加 specifications 欄位
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.variant_options && Object.keys(item.variant_options).length > 0) {
          // 將變體選項轉換為規格字串
          item['specifications'] = Object.entries(item.variant_options)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        }
      })
    })

    return { data: orders, total }
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'user']
    })

    if (!order) {
      throw new NotFoundException(`訂單 ID ${id} 不存在`)
    }

    // 為每個訂單項目添加 specifications 欄位
    order.items.forEach(item => {
      if (item.variant_options && Object.keys(item.variant_options).length > 0) {
        // 將變體選項轉換為規格字串
        item['specifications'] = Object.entries(item.variant_options)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      }
    })

    return order
  }

  async findByUser(userId: number, company: string): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: { user_id: userId, company },
      relations: ['items'],
      order: { created_at: 'DESC' }
    })

    // 為每個訂單項目添加 specifications 欄位
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.variant_options && Object.keys(item.variant_options).length > 0) {
          // 將變體選項轉換為規格字串
          item['specifications'] = Object.entries(item.variant_options)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        }
      })
    })

    return orders
  }

  async updateStatus(id: number, status: string): Promise<Order> {
    const order = await this.findOne(id)
    const oldStatus = order.status
    
    // 如果訂單從非取消狀態改為取消狀態，需要回復庫存
    if (oldStatus !== 'cancelled' && status === 'cancelled') {
      await this.restoreStock(order)
    }
    
    // 如果訂單從取消狀態改為其他狀態，需要重新扣減庫存
    if (oldStatus === 'cancelled' && status !== 'cancelled') {
      await this.deductStock(order)
    }
    
    order.status = status
    return this.orderRepository.save(order)
  }

  private async restoreStock(order: Order): Promise<void> {
    for (const item of order.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.product_id },
        relations: ['variants']
      })
      
      if (product) {
        // 如果有變體選項，回復變體庫存
        if (product.variants && product.variants.length > 0 && item.variant_options && Object.keys(item.variant_options).length > 0) {
          const matchingVariant = product.variants.find(variant => {
            return Object.entries(item.variant_options!).every(([key, value]) => 
              variant.variant_options[key] === value
            )
          })

          if (matchingVariant) {
            matchingVariant.stock_quantity += item.quantity
            await this.productRepository.save(product)
          }
        } else {
          // 回復主商品庫存
          product.stock_quantity += item.quantity
          await this.productRepository.save(product)
        }
      }
    }
  }

  private async deductStock(order: Order): Promise<void> {
    for (const item of order.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.product_id },
        relations: ['variants']
      })
      
      if (!product) {
        throw new NotFoundException(`商品 ID ${item.product_id} 不存在`)
      }
      
      // 檢查庫存是否足夠
      let stockToCheck = product.stock_quantity
      let variantToUpdate: any = null

      // 如果有變體選項，檢查變體庫存
      if (product.variants && product.variants.length > 0 && item.variant_options && Object.keys(item.variant_options).length > 0) {
        const matchingVariant = product.variants.find(variant => {
          return Object.entries(item.variant_options!).every(([key, value]) => 
            variant.variant_options[key] === value
          )
        })

        if (matchingVariant) {
          stockToCheck = matchingVariant.stock_quantity
          variantToUpdate = matchingVariant
        }
      }
      
      if (stockToCheck < item.quantity) {
        const productDisplayName = variantToUpdate && item.variant_options
          ? `${product.name} (${Object.entries(item.variant_options).map(([k, v]) => `${k}:${v}`).join(', ')})`
          : product.name
        throw new BadRequestException(`商品 "${productDisplayName}" 庫存不足，目前庫存：${stockToCheck}，需求數量：${item.quantity}`)
      }
      
      // 扣減庫存
      if (variantToUpdate) {
        variantToUpdate.stock_quantity -= item.quantity
        await this.productRepository.save(product)
      } else {
        product.stock_quantity -= item.quantity
        await this.productRepository.save(product)
      }
    }
  }

  async updatePaymentStatus(id: number, paymentStatus: string): Promise<Order> {
    const order = await this.findOne(id)
    order.payment_status = paymentStatus
    return this.orderRepository.save(order)
  }

  async updateShippingStatus(id: number, shippingStatus: string): Promise<Order> {
    const order = await this.findOne(id)
    order.shipping_status = shippingStatus
    return this.orderRepository.save(order)
  }

  async updateAdminNotes(id: number, adminNotes: string): Promise<Order> {
    const order = await this.findOne(id)
    order.admin_notes = adminNotes
    return this.orderRepository.save(order)
  }

  // 更新綠界交易資訊
  async updateEcpayInfo(id: number, ecpayData: {
    merchantTradeNo?: string
    tradeNo?: string
    paymentType?: string
    paymentDate?: string
    returnData?: any
  }): Promise<Order> {
    const order = await this.findOne(id)
    
    if (ecpayData.merchantTradeNo) {
      order.ecpay_merchant_trade_no = ecpayData.merchantTradeNo
    }
    if (ecpayData.tradeNo) {
      order.ecpay_trade_no = ecpayData.tradeNo
    }
    if (ecpayData.paymentType) {
      order.ecpay_payment_type = ecpayData.paymentType
    }
    if (ecpayData.paymentDate) {
      order.ecpay_payment_date = ecpayData.paymentDate
    }
    if (ecpayData.returnData) {
      order.ecpay_return_data = JSON.stringify(ecpayData.returnData)
    }
    
    return this.orderRepository.save(order)
  }

  private async generateOrderNumber(): Promise<string> {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    
    // 查找今天的最後一個訂單編號
    const datePrefix = `ORD-${year}${month}${day}`
    const lastOrder = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.order_number LIKE :prefix', { prefix: `${datePrefix}%` })
      .orderBy('order.order_number', 'DESC')
      .getOne()

    let sequence = 1
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.order_number.slice(-3))
      sequence = lastSequence + 1
    }

    return `${datePrefix}${String(sequence).padStart(3, '0')}`
  }

  /**
   * 根據公司ID獲取公司信息
   */
  async getUserCompany(companyId: number): Promise<Company | null> {
    if (!companyId) {
      return null;
    }
    
    return await this.companyRepository.findOne({
      where: { id: companyId }
    });
  }
}