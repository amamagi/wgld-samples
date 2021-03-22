import os
from PIL import Image

def main():
    ls = os.listdir()
    dir = []
    for obj in ls:
        if os.path.isdir(obj) and not obj.startswith("."):
            dir.append(obj)

    gen_lines = ''
    thumb = 'thumb.png'
    base = 'https://amamagi.github.io/wgld-samples'
    max_igm_size = 256
    width = '200'
    for d in dir:
        img_path = '{0}/{1}'.format(d, thumb)
        if not os.path.exists(img_path):
            continue
        img = Image.open(img_path)
        dirty = False
        if not img.size[0] == img.size[1]:
            img = crop_max_square(img)
            dirty = True
            print('croped ' + img_path)
        if  img.size[0] > max_igm_size:
            img = img.resize((max_igm_size, max_igm_size), Image.BICUBIC)
            dirty = True
            print('resized  ' + img_path)
        if dirty:
            img.save(img_path)
        gen_lines += '<a href="{3}/{4}"><img src="{0}" alt="{1}" width="{2}"/></a>'.format(img_path, d, width, base, d)

    gen_lines += '\n'

    readme = 'readme.md'
    gen_body = ""
    with open(readme, 'r') as f:
        tag = '<!--rendered-->'
        preface = ''
        postface = ''
        tag_ctn = 0

        for s_line in f:
            if tag not in s_line:
                if tag_ctn == 0:
                    preface += s_line
                if tag_ctn == 2:
                    postface += s_line
                if tag_ctn == 0 and s_line == '':
                    print("Invalid readme file")
                    exit()
            else:
                if tag_ctn == 0:
                    preface += s_line
                if tag_ctn == 1:
                    postface += s_line
                tag_ctn += 1

        gen_body = preface
        gen_body += gen_lines
        gen_body += postface
    
    with open(readme, 'w') as f:
        f.write(gen_body)

def crop_max_square(pil_img):
    return crop_center(pil_img, min(pil_img.size), min(pil_img.size))

def crop_center(pil_img, crop_width, crop_height):
    img_width, img_height = pil_img.size
    return pil_img.crop(((img_width - crop_width) // 2,
                         (img_height - crop_height) // 2,
                         (img_width + crop_width) // 2,
                         (img_height + crop_height) // 2))

if __name__ == '__main__':
    main()