import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Banner } from './banner.entity';
import { Repository } from 'typeorm';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private bannerRepo: Repository<Banner>,
  ) {}

  findAll() {
    return this.bannerRepo.find({ order: { sort: 'DESC' } });
  }

  findOne(id: number) {
    return this.bannerRepo.findOne({ where: { id } });
  }

  create(data: CreateBannerDto) {
    const banner = this.bannerRepo.create({
        title: data.title,
        desktop_image_url: data.desktop_image_url,
        mobile_image_url: data.mobile_image_url,
        start_time: data.start_time,
        end_time: data.end_time,
        sort: data.sort,
        status: data.status,
        company: { id: data.company.id }, // 👈 確保正確建立關聯
    });

    return this.bannerRepo.save(banner);
    }

  update(id: number, data: UpdateBannerDto) {
    return this.bannerRepo.update(id, data);
  }

  remove(id: number) {
    return this.bannerRepo.delete(id);
  }
}
