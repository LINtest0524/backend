import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { User, UserRole } from '../user/user.entity';

export interface CreateMessageDto {
  receiverId?: number;
  receiverUsername?: string;
  title: string;
  content: string;
  messageType?: 'SYSTEM' | 'USER' | 'ADMIN';
}

export interface MessageListQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 發送消息
  async sendMessage(senderId: number | null, companyId: number, createMessageDto: CreateMessageDto): Promise<Message> {
    let receiverId: number;

    // 如果提供了 receiverId，直接使用
    if (createMessageDto.receiverId) {
      receiverId = createMessageDto.receiverId;
    } 
    // 如果提供了 receiverUsername，通過用戶名查找用戶
    else if (createMessageDto.receiverUsername) {
      const receiver = await this.userRepository.findOne({
        where: { 
          username: createMessageDto.receiverUsername,
          company_id: companyId 
        }
      });

      if (!receiver) {
        throw new BadRequestException(`找不到用戶名為 "${createMessageDto.receiverUsername}" 的用戶`);
      }

      receiverId = receiver.id;
    } 
    else {
      throw new BadRequestException('必須提供收件人 ID 或用戶名');
    }

    const message = this.messageRepository.create({
      senderId,
      receiverId,
      companyId,
      title: createMessageDto.title,
      content: createMessageDto.content,
      messageType: createMessageDto.messageType || 'USER',
    });

    const savedMessage = await this.messageRepository.save(message);
    return savedMessage;
  }

  // 獲取用戶的消息列表
  async getMessages(userId: number, companyId: number, query: MessageListQuery) {
    const { page = 1, limit = 20, isRead } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.receiverId = :userId', { userId })
      .andWhere('message.companyId = :companyId', { companyId })
      .andWhere('message.isDeletedByReceiver = false')
      .orderBy('message.createdAt', 'DESC');

    if (isRead !== undefined) {
      queryBuilder.andWhere('message.isRead = :isRead', { isRead });
    }

    const [messages, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 獲取單個消息詳情
  async getMessageById(messageId: number, userId: number, companyId: number): Promise<Message> {
    const message = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.id = :messageId', { messageId })
      .andWhere('message.receiverId = :userId', { userId })
      .andWhere('message.companyId = :companyId', { companyId })
      .andWhere('message.isDeletedByReceiver = false')
      .getOne();

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    return message;
  }

  // 標記消息為已讀
  async markAsRead(messageId: number, userId: number, companyId: number): Promise<Message> {
    const message = await this.getMessageById(messageId, userId, companyId);

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await this.messageRepository.save(message);
    }

    return message;
  }

  // 標記多個消息為已讀
  async markMultipleAsRead(messageIds: number[], userId: number, companyId: number): Promise<void> {
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ 
        isRead: true, 
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where('id IN (:...messageIds)', { messageIds })
      .andWhere('receiverId = :userId', { userId })
      .andWhere('companyId = :companyId', { companyId })
      .andWhere('isDeletedByReceiver = false')
      .execute();
  }

  // 刪除消息（軟刪除）
  async deleteMessage(messageId: number, userId: number, companyId: number): Promise<void> {
    const message = await this.getMessageById(messageId, userId, companyId);

    message.isDeletedByReceiver = true;
    await this.messageRepository.save(message);
  }

  // 批量刪除消息
  async deleteMultipleMessages(messageIds: number[], userId: number, companyId: number): Promise<void> {
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ 
        isDeletedByReceiver: true,
        updatedAt: new Date()
      })
      .where('id IN (:...messageIds)', { messageIds })
      .andWhere('receiverId = :userId', { userId })
      .andWhere('companyId = :companyId', { companyId })
      .execute();
  }

  // 獲取未讀消息數量
  async getUnreadCount(userId: number, companyId: number): Promise<number> {
    return await this.messageRepository.count({
      where: {
        receiverId: userId,
        companyId,
        isRead: false,
        isDeletedByReceiver: false,
      },
    });
  }

  // 系統發送消息給所有用戶
  async sendSystemMessageToAll(companyId: number, title: string, content: string): Promise<void> {
    // 獲取該公司的所有用戶
    const users = await this.userRepository.find({
      where: { 
        company_id: companyId,
        role: UserRole.USER // 只發送給一般用戶
      }
    });

    // 為每個用戶創建系統消息
    const messages = users.map(user => this.messageRepository.create({
      senderId: null, // 系統消息沒有發送者
      receiverId: user.id,
      companyId: companyId,
      title: title,
      content: content,
      messageType: 'SYSTEM',
    }));

    // 批量保存消息
    await this.messageRepository.save(messages);
  }

  // 管理員發送消息給特定用戶
  async sendAdminMessage(adminId: number, companyId: number, createMessageDto: CreateMessageDto): Promise<Message> {
    return await this.sendMessage(adminId, companyId, {
      ...createMessageDto,
      messageType: 'ADMIN'
    });
  }

  // 管理員獲取所有消息（分頁）
  async getAllMessages(companyId: number, query: MessageListQuery & { messageType?: string; isRead?: boolean }) {
    const { page = 1, limit = 20, messageType, isRead } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .where('message.companyId = :companyId', { companyId })
      .orderBy('message.createdAt', 'DESC');

    if (messageType && messageType !== 'ALL') {
      queryBuilder.andWhere('message.messageType = :messageType', { messageType });
    }

    if (isRead !== undefined) {
      queryBuilder.andWhere('message.isRead = :isRead', { isRead });
    }

    const [messages, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}